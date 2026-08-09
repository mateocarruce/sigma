import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Planilla } from '../../planillas/entities/planilla.entity';
import { AuditAction } from '../../../common/enums';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({
    type: 'enum',
    enum: AuditAction,
    enumName: 'audit_action_enum',
  })
  action: AuditAction;

  @ManyToOne(() => Planilla, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'file_id' })
  file: Planilla | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'text', nullable: true })
  resultado: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;
}
