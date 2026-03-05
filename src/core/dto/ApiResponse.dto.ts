export class ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;

  constructor(success: boolean, message?: string, data?: T) {
    this.success = success;
    if (message) this.message = message;
    if (data) this.data = data;
  }
}
