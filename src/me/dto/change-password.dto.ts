import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'old_pass' })
  @IsString()
  @MinLength(1)
  current_password!: string;

  @ApiProperty({ example: 'new_pass_123', minLength: 8 })
  @IsString()
  @MinLength(8)
  new_password!: string;
}
