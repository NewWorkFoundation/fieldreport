import { handleProfileProgress } from '../server/profileProgressApi.mjs'

export default async function handler(req, res) {
  await handleProfileProgress(req, res)
}
