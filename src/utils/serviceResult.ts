import { MongoError, MongoServerError } from "mongodb";
import { MongooseError } from "mongoose";

function ServiceLevelError(message: string) {
  return {
    message,
    errorCode: 222,
  };
}

export function SuccessServiceResult(data: any) {
  return { data, error: null };
}

export function ErrorServiceResult(error: unknown) {
  if (error instanceof Error)
    return { data: null, error: ServiceLevelError(error.message) };
  if (typeof error === "string")
    return { data: null, error: ServiceLevelError(error) };
  return {
    data: null,
    error: ServiceLevelError("Something went wrong!"),
  };
}
