const crc16iec = require('./crc16iec.js');
const bcdDate = require('bcd-date');

const getRandomInt = (max = 100000) => {
    return Math.floor(Math.random() * max);
}

const Meter = {
    POWER_UNIT_NR: 0x01020304, //0x003e2c5e, // default one
    POWER_UNIT_PASS: 0x0,
    t1: getRandomInt(),
    t2: getRandomInt(),
    t3: getRandomInt(),
    t4: getRandomInt(),
}

const CMD = {
    ENQ: 0x01, // Enquiry data
    REC: 0x03, // Record data
    DRJ: 0x0A, // Protocol error
    OK: 0x0B, // Writing confirmation
}

const POS = {
    MAGIC_2: 0,
    LEN: 1,
    ADDR: 2,
    PASS: 6,
    COM: 10,
    COM_ID: 11,
    DATA_BLOCK: 12,
}

const COM = {
    C00: {
        SIZE_CMD: 0x0E,
        SIZE_REPLY: 0x36,
        POS: {
            FW_VER: 0,
            ERR1: 2,
            ERR2: 4,
            ERR3: 6,
            DIAG: 8,
            SERIAL_NR: 12,
            NETWORK_NR: 16,
            PHYS_ADDR: 20,
            HW_VER_BCD: 36,
            PARAM_VER_BCD: 37,
            STATUS: 38,
        }
    },
    C01: {
        SIZE_CMD: 0x0E,
        SIZE_REPLY: 0x17,
        POS: {
            SECOND: 0,
            MINUTE: 1,
            HOUR: 2,
            DAY: 3,
            MONTH: 4,
            YEAR: 5,
            WEEKDAY: 6,
            DST_ALLOWED: 7,
            CORRECTION: 8,

        }
    },
    C02: {
        SIZE_CMD: 0x0E,
        SIZE_REPLY: 0x12,
        POS: {
            POWER_WATTS: 0,
        }
    },
    C03: {
        SIZE_CMD: 0x0E,
        SIZE_REPLY: 0x23,
        POS: {
            T_CURRENT: 0,
            T_SUM: 1,
            T1: 5,
            T2: 9,
            T3: 13,
            T4: 17,
        }
    }
}

const writeUint16 = (buffer, position, number) => {
    buffer[position + 1] = (number & 0x0000ff00) >> 8;
    buffer[position + 0] = (number & 0x000000ff);
}

const writeUint32 = (buffer, position, number) => {
    buffer[position + 3] = (number & 0xff000000) >> 24;
    buffer[position + 2] = (number & 0x00ff0000) >> 16;
    buffer[position + 1] = (number & 0x0000ff00) >> 8;
    buffer[position + 0] = (number & 0x000000ff);
}

const readUint32 = (buffer, position) => {
    let number =
        (buffer[position + 3] << 24) |
        (buffer[position + 2] << 16) |
        (buffer[position + 1] << 8) |
        (buffer[position + 0]);
    return number;
}

const writeHeader = (buffer, com, id, replySize) => {
    buffer[POS.MAGIC_2] = 2;
    buffer[POS.LEN] = replySize;
    writeUint32(buffer, POS.ADDR, Meter.POWER_UNIT_NR);
    writeUint32(buffer, POS.PASS, Meter.POWER_UNIT_PASS);
    buffer[POS.COM] = com;
    buffer[POS.COM_ID] = id;
}

const toHexString = (buf) => Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
const toHexString32 = (uint) => uint.toString(16).padStart(8, "0");

const createReply = (com, id, replySize) => {
    var buffer = new Uint8Array(replySize);
    writeHeader(buffer, com, id, replySize);
    return buffer;
}

/**
 * Set serial number for emulator. Default one is 0x003e2c5e
 * @param {number} serialNumber - 32-bit integer. 
 */
function setSerialNumber(serialNumber) {
    Meter.POWER_UNIT_NR = +serialNumber;
}

/**
 * Parse incoming command and provide a response if it can be done. 
 * @param {array|Buffer} inputBuffer Input data from the port
 * @param {function(Uint8Array)} cbWritePort Function to write output buffer to port. Shall be able to take Uint8Array as input
 * @returns true if input command parsed properly and supported, false otherwise
 */
function checkCommandAndExecute(inputBuffer, cbWritePort) {
    console.log ("");
    if (!cbWritePort) {
        console.error("cbWritePort function missing");
        process.exit(2);
        return false;
    }

    const crcOkay = crc16iec(inputBuffer);
    console.log(`Input:  ${toHexString(inputBuffer)}`);

    if (!crcOkay) {
        console.error("CRC error");
        return false;
    }

    if (inputBuffer[POS.MAGIC_2] !== 2) {
        console.error("Wrong magic");
        return false;
    }

    if (inputBuffer.length !== 0x0E) {
        console.error("Command not supported. Wrong length");
        return false;
    }

    const requestAddr = readUint32(inputBuffer, POS.ADDR);
    if (requestAddr === 0) {
        console.log("Address in request is 0x0. Processing.")
    } else if (requestAddr == Meter.POWER_UNIT_NR) {
        console.log("Request addressed to us. Processing.")
    } else {
        console.log(`Our address is 0x${toHexString32(Meter.POWER_UNIT_NR)}, but request addressed to 0x${toHexString32(requestAddr)}. Skipping.`);
        return false;
    }

    const com = inputBuffer[POS.COM];
    const id = inputBuffer[POS.COM_ID];

    let properCommand = false;

    if (com === CMD.ENQ) {
        let replyBuffer = null;
        switch (id) {
            case 0: // Чтение информации о счетчике
                console.log("Command 01:00 ENQ Meter information");
                properCommand = true;

                replyBuffer = createReply(CMD.ENQ, 0x00, COM.C00.SIZE_REPLY);

                // 20 04 - version 
                // 00 00 - err1
                // 00 00 - err2
                // 00 00 - err3
                // 00 00 00 00 - diag codes
                // 5E 2C 3E 00 - id
                // 5E 2C 3E 00 - id
                // 30 30 30 30 - 30 30 30 30 - 30 30 30 30 - 30 30 30 30 - addr phys 
                // 04 - ver elec
                // 02 - ver param
                // 81 00 - status
                // A3 48 -crc

                writeUint16(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.FW_VER, 0x0420);
                writeUint16(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.ERR1, 0);
                writeUint16(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.ERR2, 0);
                writeUint16(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.ERR3, 0);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.DIAG, 0);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.SERIAL_NR, Meter.POWER_UNIT_NR);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.NETWORK_NR, Meter.POWER_UNIT_NR);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.PHYS_ADDR + 0 * 4, 0x30303030);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.PHYS_ADDR + 1 * 4, 0x30303030);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.PHYS_ADDR + 2 * 4, 0x30303030);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.PHYS_ADDR + 3 * 4, 0x30303030);
                replyBuffer[POS.DATA_BLOCK + COM.C00.POS.HW_VER_BCD] = 0x04;
                replyBuffer[POS.DATA_BLOCK + COM.C00.POS.PARAM_VER_BCD] = 0x02;
                writeUint16(replyBuffer, POS.DATA_BLOCK + COM.C00.POS.STATUS, 0x0081);

                crc16iec(replyBuffer, true);

                console.log(`Output: ${toHexString(replyBuffer)}`);

                cbWritePort(replyBuffer);
                break;

            case 1: // Чтение даты и времени
                console.log("Command 01:01 ENQ Date/time");
                properCommand = true;

                replyBuffer = createReply(CMD.ENQ, 0x01, COM.C01.SIZE_REPLY);

                const todayDate = new Date();
                const todayBCD = bcdDate.encode(todayDate);
                const isSummer = (todayDate.getMonth() >= 4 && todayDate.getMonth() <= 10);
                const dayOfWeekByte = 0xFF & (todayDate.getDay() | (isSummer ? 0b10000000 : 0));

                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.SECOND] = todayBCD[5]; //ss
                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.MINUTE] = todayBCD[4]; //mm
                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.HOUR] = todayBCD[3]; //hh
                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.DAY] = todayBCD[2]; //day
                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.MONTH] = todayBCD[1]; //month
                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.YEAR] = todayBCD[0]; //year
                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.WEEKDAY] = dayOfWeekByte;
                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.DST_ALLOWED] = 0;
                replyBuffer[POS.DATA_BLOCK + COM.C01.POS.CORRECTION] = 0;

                crc16iec(replyBuffer, true);

                console.log(`Output: ${toHexString(replyBuffer)}`);

                cbWritePort(replyBuffer);

                break;

            case 2: // Чтение текущего значения активной мощности
                console.log("Command 01:02 ENQ Current average active power");
                properCommand = true;

                replyBuffer = createReply(CMD.ENQ, 0x02, COM.C02.SIZE_REPLY);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C02.POS.POWER_WATTS, getRandomInt(10000));

                crc16iec(replyBuffer, true);

                console.log(`Output: ${toHexString(replyBuffer)}`);

                cbWritePort(replyBuffer);

                break;

            case 3: // Чтение текущих накоплений энергии нарастающим итогом по тарифам
                console.log("Command 01:03 ENQ consumed energy by tariffs");
                properCommand = true;
                replyBuffer = createReply(CMD.ENQ, 0x03, COM.C03.SIZE_REPLY);

                replyBuffer[POS.DATA_BLOCK + COM.C03.POS.T_CURRENT] = 1; // T1 is current
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C03.POS.T_SUM, Meter.t1 + Meter.t2 + Meter.t3 + Meter.t4);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C03.POS.T1, Meter.t1);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C03.POS.T2, Meter.t2);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C03.POS.T3, Meter.t3);
                writeUint32(replyBuffer, POS.DATA_BLOCK + COM.C03.POS.T4, Meter.t4);

                crc16iec(replyBuffer, true);

                console.log(`Output: ${toHexString(replyBuffer)}`);

                cbWritePort(replyBuffer);

                Meter.t1 += Math.floor(Math.random() * 10);
                break;
        }

    }

    if (!properCommand) {
        console.log('Command not supported');
    }

    return properCommand;
}

module.exports.setSerialNumber = setSerialNumber;
module.exports.checkCommandAndExecute = checkCommandAndExecute;