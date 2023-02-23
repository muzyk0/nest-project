export class UserViewModel {
  id: string;
  login: string;
  email: string;
  createdAt: string;
  banInfo: {
    isBanned: boolean;
    banDate: string;
    banReason: string;
  };
}

export class UserBloggerViewModel {
  id: string;
  login: string;
  banInfo: {
    isBanned: boolean;
    banDate: string;
    banReason: string;
  };
}
