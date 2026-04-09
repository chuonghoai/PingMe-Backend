import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: { email: email },
    });
  }

  async findById(userId: string): Promise<User | null> {
    return this.findOne({
      where: { id: userId },
    });
  }
}
