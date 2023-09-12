require('dotenv').config();

const { SerialPort } = require('serialport');
const { InterByteTimeoutParser } = require('@serialport/parser-inter-byte-timeout');

const ce2727a = require('./ce2727a.js');

const interval = +process.env.INTERVAL_MS || 50; // time limit in milliseconds to receive one command
const maxBufferSize = 64; // max buffer for command

const path =  process.env.PORT || 'COM1';

const port = new SerialPort({
    path,
    baudRate: +process.env.BAUDRATE || 9600,
    dataBits: +process.env.DATABITS || 8,
    parity: process.env.PARITY || "even",
    stopBits: +process.env.STOPBITS || 1,
});

const parser = port.pipe(new InterByteTimeoutParser({ interval, maxBufferSize }));

const writePort = (buf) => {
    let retries = 3;
    while (retries--) {
        if (port.write(buf)) {
            port.drain();
            return;
        } else {
            port.drain();
        }
    }
    console.log('writePort failed');
}

ce2727a.setSerialNumber(0x003e2c5e);
console.log(`CE2727A Emulator started on port ${path}. Supported ENQ commands: 00, 01, 02, 03`);

parser.on('data', buffer => ce2727a.checkCommandAndExecute(buffer, writePort));
port.on('error', err => console.log('Error: ', err.message));
