import { Response } from "express";
interface User {
  firstName: String;
  lastName: String;
  email: String;
  phone: String;
  password: String;
}

enum Status {
  Success, // 0
  Failed, //1
  unknown, //2
}

interface MResponse {
  code?: Number;
  status: Status;
}

interface SuccessMResponse extends MResponse {
  data: any;
}
interface ErrorMResponse extends MResponse {
  reason: String;
}
/*
  {
    errorCode: domain code error
    message: brief decsription of error
    detail: detail description of error
  }
*/
class ErrorResponseClass {
  errorCode: number;
  errorMessage: string;
  errrorDetail: string;
  setErrorCode(code: number) {
    this.errorCode = code;
    return this;
  }
  setErrorMessage(msg: string) {
    this.errorMessage = msg;
    return this;
  }
  setErrorDetail(des: string) {
    this.errrorDetail = des;
    return this;
  }
  toJSON() {
    return {
      errorCode: this.errorCode,
      message: this.errorMessage,
      detail: this.errrorDetail,
    };
  }
}

function ErrorResponse(
  errorCode: number,
  message: string
): {
  status: "error";
  errorCode: number;
  message: string;
} {
  return {
    status: "error",
    errorCode: errorCode,
    message: message,
  };
}

function SuccessResponse(
  data: any,
  message: string
): {
  status: "success";
  message: string;
  data: any;
} {
  return {
    status: "success",
    message: message,
    data: data,
  };
}

export {
  SuccessMResponse,
  ErrorMResponse,
  Status,
  ErrorResponse,
  SuccessResponse,
};
