enum Status {
  Success, // 0
  Failed, //1
  unknown, //2
}

/*
  {
    errorCode: domain code error
    message: brief decsription of error
    detail: detail description of error
  }
*/

function ErrorResponse(
  error: string,
  errorCode: number = 333
): {
  status: "error";
  errorCode: number;
  error: string;
} {
  return {
    status: "error",
    errorCode,
    error,
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

function HttpSuccessResponse(data: any) {
  return data;
}

function HttpErrorResponse(message: string, errorCode: number = 333) {
  return {
    message,
    errorCode,
  };
}

export {
  Status,
  ErrorResponse,
  SuccessResponse,
  HttpErrorResponse,
  HttpSuccessResponse,
};
