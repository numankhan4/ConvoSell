import { validate } from 'class-validator';
import { RegisterDto, ResetPasswordDto } from './auth.dto';

function collectConstraintMessages(errors: any[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints || {}),
    ...collectConstraintMessages(error.children || []),
  ] as string[]);
}

describe('Auth DTO password policy', () => {
  const validRegisterBase = {
    email: 'owner@example.com',
    firstName: 'Ali',
    lastName: 'Khan',
    workspaceName: 'Demo Workspace',
  };

  describe('RegisterDto', () => {
    it('accepts a strong password', async () => {
      const dto = Object.assign(new RegisterDto(), {
        ...validRegisterBase,
        password: 'StrongPass1!A',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects weak password without required complexity', async () => {
      const dto = Object.assign(new RegisterDto(), {
        ...validRegisterBase,
        password: 'alllowercase12',
      });

      const errors = await validate(dto);
      const messages = collectConstraintMessages(errors);

      expect(messages).toContain(
        'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });

    it('rejects password shorter than 12 characters', async () => {
      const dto = Object.assign(new RegisterDto(), {
        ...validRegisterBase,
        password: 'Aa1!short',
      });

      const errors = await validate(dto);
      const messages = collectConstraintMessages(errors);

      expect(messages).toContain('Password must be at least 12 characters long');
    });
  });

  describe('ResetPasswordDto', () => {
    it('accepts a strong new password', async () => {
      const dto = Object.assign(new ResetPasswordDto(), {
        token: 'this-is-a-long-reset-token-value-12345',
        newPassword: 'ResetPass1!Good',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects weak new password', async () => {
      const dto = Object.assign(new ResetPasswordDto(), {
        token: 'this-is-a-long-reset-token-value-12345',
        newPassword: 'weakpassword12',
      });

      const errors = await validate(dto);
      const messages = collectConstraintMessages(errors);

      expect(messages).toContain(
        'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    });
  });
});
