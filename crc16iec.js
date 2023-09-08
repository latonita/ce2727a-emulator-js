//----------------------------------------------------------------------------
//  The standard 16-bit CRC polynomial specified in ISO/IEC 3309 is used.
//             16   12   5
//  Which is: x  + x  + x + 1
//----------------------------------------------------------------------------
module.exports = function crc16iec(buffer, setCrc = false) {
    var CRC = 0xFFFF;
    var d = 0;
    var ptr = 0;
    var len = buffer.length;

    if (setCrc) {
        if (len < 2)
            return false;
        len -= 2; // Do not include CRC in calculation.
    }
    if (len <= 0) return;
    do {
        d = buffer[ptr++] ^ (CRC & 0xFF);
        d ^= d << 4;
        d &= 0xff;
        CRC = (d << 3) ^ (d << 8) ^ (CRC >> 8) ^ (d >> 4);
    } while (--len);

    if (setCrc) {
        // Store complement of CRC.
        CRC ^= 0xFFFF;
        d = CRC & 0xFF;
        buffer[ptr] = d;
        ptr++;
        d = (CRC >> 8) & 0xFF;
        buffer[ptr] = d;
        return true;
    } else {
        return (CRC & 0x0FFFF) == 0xF0B8;
    }
};