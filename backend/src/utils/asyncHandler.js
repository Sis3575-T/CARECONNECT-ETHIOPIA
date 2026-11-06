/**
 * CareConnect Ethiopia - Asynchronous Route Error Wrapper
 * Safely forwards asynchronous promise rejections to Express next(err) handler.
 */

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
