module.exports = function create(method, path, fn) {
  fn.method = method;
  fn.path = path;
  return fn;
};