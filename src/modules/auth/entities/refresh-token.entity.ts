import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  /** SHA-256 del token opaco; el token en claro nunca se guarda. */
  @Index({ unique: true }) @Column({ length: 64 }) tokenHash: string;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt: Date | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) ip: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) userAgent: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
