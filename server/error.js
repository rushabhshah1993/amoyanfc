import { ApolloError } from 'apollo-server-errors';

export class NotFoundError extends ApolloError {
    constructor(message) {
        super(message, "NOT_FOUND");
    }
}

export class ValidationError extends ApolloError {
    constructor(message) {
      super(message, "VALIDATION_ERROR");
    }
}
  
export class AuthenticationError extends ApolloError {
    constructor(message) {
        super(message, "AUTHENTICATION_ERROR");
    }
}
