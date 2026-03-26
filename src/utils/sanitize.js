function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const {
    password_hash,
    ...rest
  } = user;

  return rest;
}

module.exports = {
  sanitizeUser
};
