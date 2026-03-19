import { getOptionalUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await getOptionalUser(event);
  return { user };
});
