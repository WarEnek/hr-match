import type { H3Event } from 'h3'

    import { requestStructuredCompletion } from '~/server/services/novita/client'
    import { getResolvedAiSettings } from '~/server/services/novita/settings'
    import { createSupabaseServerClient } from '~/server/services/supabase/server'
    import { appLogger, buildRequestLogContext } from '~/server/utils/logger'
    import { documentTreeSchema, summaryComposerJsonSchema, summaryComposerResponseSchema } from '~/server/utils/schemas'

    function formatDateRange(startDate: string | null, endDate: string | null, isCurrent: boolean) {
      const start = startDate || 'Unknown'
      const end = isCurrent ? 'Present' : endDate || 'Unknown'
      return `${start} - ${end}`
    }

    function fallbackSummary(profile: any, vacancy: any, evidenceSnippets: string[]) {
      const headline = profile.headline || profile.summary_default || 'Candidate profile available.'
      const target = vacancy.title ? `Target role: ${vacancy.title}.` : 'Target role aligned with the vacancy.'
      const evidence = evidenceSnippets.slice(0, 3).join(' ')
      return `${headline} ${target} Evidence highlights: ${evidence}`.trim()
    }

    export async function composeResumeDocument(
      event: H3Event,
      options: {
        profileId: string
        userId: string
        vacancyId: string
        analysis: any
        evidenceLinks: Array<{ requirement_id: string; source_type: string; source_id: string; score: number; reason: string }>
      },
    ) {
      const supabase = createSupabaseServerClient(event)
      const [{ data: profile }, { data: vacancy }, { data: skills }, { data: experiences }, { data: experienceBullets }, { data: projects }, { data: projectBullets }, { data: certifications }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', options.profileId).maybeSingle(),
        supabase.from('vacancies').select('*').eq('id', options.vacancyId).maybeSingle(),
        supabase.from('skills').select('*').eq('profile_id', options.profileId),
        supabase.from('experiences').select('*').eq('profile_id', options.profileId).order('start_date', { ascending: false }),
        supabase.from('experience_bullets').select('*').eq('profile_id', options.profileId),
        supabase.from('projects').select('*').eq('profile_id', options.profileId).order('created_at', { ascending: false }),
        supabase.from('project_bullets').select('*').eq('profile_id', options.profileId),
        supabase.from('certifications').select('*').eq('profile_id', options.profileId).order('issued_at', { ascending: false }),
      ])

      const evidenceScoreMap = new Map(options.evidenceLinks.map((link) => [`${link.source_type}:${link.source_id}`, link.score]))
      const evidenceSnippets = options.evidenceLinks.slice(0, 5).map((link) => link.reason)

      let summary = fallbackSummary(profile, vacancy, evidenceSnippets)

      try {
        const aiSettings = await getResolvedAiSettings(event, options.userId)
        const summaryResponse = await requestStructuredCompletion({
          event,
          apiKey: aiSettings.apiKey,
          baseUrl: aiSettings.baseUrl,
          model: aiSettings.model,
          schemaName: 'summary_composer',
          jsonSchema: summaryComposerJsonSchema,
          validator: summaryComposerResponseSchema,
          systemPrompt: [
            'You write ATS-safe professional summaries.',
            'Use only the facts present in the provided evidence.',
            'Do not invent experience, impact, seniority, or tools.',
            'Return one compact paragraph in plain English.',
          ].join(' '),
          userPrompt: [
            `Target title: ${vacancy?.title || 'Unknown role'}`,
            `Target company: ${vacancy?.company || 'Unknown company'}`,
            `Default summary: ${profile?.summary_default || ''}`,
            'Evidence:',
            ...evidenceSnippets,
        ].join('\\n'),
          temperature: Math.min(aiSettings.temperature, 0.3),
          maxTokens: Math.min(aiSettings.maxTokens, 400),
        })

        summary = summaryResponse.summary
      } catch (error) {
        appLogger.warn(
          'Summary composer fell back to deterministic output.',
          buildRequestLogContext(event, {
            profileId: options.profileId,
            vacancyId: options.vacancyId,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        )
      }

      const sortedSkills = [...(skills || [])]
        .sort((left: any, right: any) => {
          const leftScore = evidenceScoreMap.get(`skill:${left.id}`) || 0
          const rightScore = evidenceScoreMap.get(`skill:${right.id}`) || 0
          return rightScore - leftScore
        })
        .slice(0, 12)
        .map((skill: any) => skill.name)

      const groupedExperienceBullets = new Map<string, any[]>()
      for (const bullet of experienceBullets || []) {
        const group = groupedExperienceBullets.get(bullet.experience_id) || []
        group.push(bullet)
        groupedExperienceBullets.set(bullet.experience_id, group)
      }

      const groupedProjectBullets = new Map<string, any[]>()
      for (const bullet of projectBullets || []) {
        const group = groupedProjectBullets.get(bullet.project_id) || []
        group.push(bullet)
        groupedProjectBullets.set(bullet.project_id, group)
      }

      const resumeExperiences = (experiences || []).slice(0, 6).map((experience: any) => {
        const bullets = [...(groupedExperienceBullets.get(experience.id) || [])]
          .sort((left, right) => {
            const leftScore = evidenceScoreMap.get(`experience_bullet:${left.id}`) || 0
            const rightScore = evidenceScoreMap.get(`experience_bullet:${right.id}`) || 0
            return rightScore - leftScore
          })
          .slice(0, 4)
          .map((bullet) => bullet.text_refined || bullet.text_raw)
          .filter(Boolean)

        return {
          id: experience.id,
          company: experience.company,
          roleTitle: experience.role_title,
          location: experience.location,
          dateRange: formatDateRange(experience.start_date, experience.end_date, experience.is_current),
          bullets,
        }
      })

      const resumeProjects = (projects || []).slice(0, 4).map((project: any) => {
        const bullets = [...(groupedProjectBullets.get(project.id) || [])]
          .sort((left, right) => {
            const leftScore = evidenceScoreMap.get(`project_bullet:${left.id}`) || 0
            const rightScore = evidenceScoreMap.get(`project_bullet:${right.id}`) || 0
            return rightScore - leftScore
          })
          .slice(0, 3)
          .map((bullet) => bullet.text_refined || bullet.text_raw)
          .filter(Boolean)

        return {
          id: project.id,
          title: project.title,
          description: project.description,
          bullets,
          url: project.url,
        }
      })

      const contacts = [profile?.email, profile?.phone, profile?.location, profile?.linkedin_url, profile?.github_url, profile?.website_url].filter(Boolean)

      const documentTree = documentTreeSchema.parse({
        profile: {
          fullName: profile?.full_name || 'Unnamed Candidate',
          headline: profile?.headline || null,
          contacts,
        },
        summary,
        skills: sortedSkills,
        experiences: resumeExperiences,
        projects: resumeProjects,
        certifications: (certifications || []).slice(0, 6).map((item: any) => ({
          id: item.id,
          name: item.name,
          issuer: item.issuer,
          issuedAt: item.issued_at,
        })),
        education: [],
        languages: [],
      })

      return documentTree
    }
