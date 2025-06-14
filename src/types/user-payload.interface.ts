export interface UserPayload {
  sub: string; // user ID
  userCode: string;
  iat?: number;
  exp?: number;
}
