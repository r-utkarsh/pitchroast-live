import tokenHandler from '../server/handlers/token';
import type { ApiRequest, ApiResponse } from '../server/http';

export default function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  return tokenHandler(req, res);
}
