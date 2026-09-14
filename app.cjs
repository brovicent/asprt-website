// File ini digunakan sebagai titik masuk (entry point) untuk Phusion Passenger (cPanel/DirectAdmin)
// jika panel hosting Anda secara spesifik meminta app.cjs

process.env.NODE_ENV = 'production';
require('./server.js');
