const bcrypt = require('bcryptjs');
bcrypt.compare('admin123', '$2b$12$LJqNCAVnBnEYA8M9u1TfIekEHNLJjeyLRX6Qggb9u4rqvuE4/P/h.').then(console.log);
