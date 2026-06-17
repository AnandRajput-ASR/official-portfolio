export interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  starred: boolean;
  notifiedAt: string | null;
  receivedAt: string;
  labels?: string[];
  archived?: boolean;
  repliedAt?: string | null;
}

export interface MessagesResponse {
  messages: Message[];
  unreadCount: number;
}
