//---------------------------------------------------------------------------------------
//  The standard 16-bit CRC polynomial specified in ISO/IEC 3309 is used.
//                    16   12   5
//  Which is: x  + x  + x + 1
//----------------------------------------------------------------------------
unsigned char CRC_Calc (unsigned char *ptr, unsigned char len, unsigned char set) {
  unsigned char d;
  unsigned short CRC;
	
  if (set)
     len -= 2;                        // Do not include CRC in calculation.
  
  CRC = 0xFFFF;
  do
  {
    d = *ptr++ ^ (CRC & 0xFF);
    d ^= d << 4;
    CRC  = (d << 3) ^ (d << 8) ^ (CRC >> 8) ^ (d >> 4);
  } while (--len);

  if (set)
  {                                   // Store complement of CRC.
    CRC ^= 0xFFFF;
    d = CRC & 0xFF;   	
    *ptr = d;
    ptr++;
    d = CRC >> 8;	
    *ptr = d;
    return 1;
  }
  else {
    return CRC == 0xF0B8;
  }
}
