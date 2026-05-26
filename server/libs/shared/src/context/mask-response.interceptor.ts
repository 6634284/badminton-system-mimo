import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EncryptionService } from '../crypto/encryption.service';

const SENSITIVE_FIELDS = ['phone', 'real_name', 'realName', 'id_card', 'idCard', 'id_number', 'idNumber'];

@Injectable()
export class MaskResponseInterceptor implements NestInterceptor {
  constructor(private readonly encryption: EncryptionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.maskSensitiveData(data)),
    );
  }

  private maskSensitiveData(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) return data.map((item) => this.maskSensitiveData(item));
    if (typeof data !== 'object') return data;

    const masked = { ...data };
    for (const key of Object.keys(masked)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.includes(key) || SENSITIVE_FIELDS.includes(lowerKey)) {
        const value = masked[key];
        if (typeof value === 'string') {
          if (lowerKey.includes('phone')) {
            masked[key] = this.encryption.maskPhone(value);
          } else if (lowerKey.includes('id') && (lowerKey.includes('card') || lowerKey.includes('number'))) {
            masked[key] = this.encryption.maskIdCard(value);
          } else if (lowerKey.includes('name') && lowerKey.includes('real')) {
            masked[key] = this.encryption.maskName(value);
          }
        }
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }
    return masked;
  }
}
