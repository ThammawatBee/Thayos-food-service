// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { DateTime } from 'luxon';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) { }
  async validateUser(userCode: string, password: string) {
    const user = await this.userService.findByUserCode(userCode); // implement this
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async login(user: any) {
    const payload = { sub: user.id, userCode: user.userCode };
    const token = jwt.sign(payload, JWT_SECRET, {
      // expiresIn: expiresInSeconds,
    });
    // const expiresAt = DateTime.now().plus({ seconds: expiresInSeconds });
    return {
      access_token: token,
      // expiresAt: Math.floor(expiresAt.toSeconds()),
    };
  }

  // async extendToken(payload: { sub: string; username: string }) {
  //   const expiresInSeconds = 2 * 60 * 60; // 2 hours
  //   const token = jwt.sign(payload, JWT_SECRET, {
  //     expiresIn: expiresInSeconds,
  //   });
  //   const expiresAt = DateTime.now().plus({ seconds: expiresInSeconds });
  //   return {
  //     access_token: token,
  //     expiresAt: Math.floor(expiresAt.toSeconds()),
  //   };
  // }

  async verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async getMyProfile(userCode: string) {
    const user = await this.userService.findByUserCode(userCode); // implement this
    return {
      id: user.id,
      name: user.name,
      userCode: user.userCode,
      role: user.role,
    };
  }
}
