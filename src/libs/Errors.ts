export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NOT_MODIFIED = 304,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export enum Message {
  SOMETHING_WENT_WRONG = "Something went wrong!",
  NO_DATA_FOUND = "No data is found!",
  CREATE_FAILED = "Create is failed!",
  UPDATE_FAILED = "Update is failed!",
  DELETE_FAILED = "Delete is failed!",

  NOT_AUTHENTICATED = "You are not authenticated, please open the bot and press 'Admin panel'.",
  NOT_ADMIN = "Only admins can do this!",
  INVALID_LOGIN_LINK = "This login link is invalid or expired. Ask the bot for a new one.",

  NO_CATEGORY = "Category not found!",
  CATEGORY_HAS_PRODUCTS = "This category still has products. Move or delete them first.",
  NO_PRODUCT = "Product not found!",
  INVALID_PRICE = "Price must be a whole number of so'm (0 or more).",
  INVALID_PHOTO = "Photo must be an image file (max 10 MB).",
  INVALID_INIT_DATA = "Open this app from the Telegram bot.",
}

class Errors extends Error {
  public code: HttpCode;
  public message: Message;

  static standard = {
    code: HttpCode.INTERNAL_SERVER_ERROR,
    message: Message.SOMETHING_WENT_WRONG,
  };

  constructor(statusCode: HttpCode, statusMessage: Message) {
    super();
    this.code = statusCode;
    this.message = statusMessage;
  }
}

export default Errors;
