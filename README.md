[English version](#tiny-emulator-of-ce2727a-power-meter-for-rs485rs232) | [Версия на русском](#микроэмулятор-счетчика-электроэнергии-цэ2727а-для-подключения-по-rs485rs232)

![ce2727a][images/overview.png]
# Микроэмулятор счетчика электроэнергии ЦЭ2727А для подключения по RS485/RS232

Эмулятор поддерживает три основные команды:
- Чтение информации о счетчике
- Чтение даты и времени
- Чтение текущих накоплений энергии нарастающим итогом по тарифам

Эмулятор создан для разработки и тестирования IoT устройства для снятия показаний через RS485. 

## Быстрый путь к успеху
- Создаем файл ```.env``` с настройками подключения. Пример в файле ```.env_example```.
(По умолчанию 9600 бод, 1 старт бит, 8 битов данных, 1 стоп бит, бит четности even.
- ```npm init```
- ```npm start```

## Формат посылок

Запросы и ответы имеют одинаковый формат.

| 0x02 | N | Network address | Password | COM | ID | DATA | CRC16 |
|---|---|---|---|---|---|---|---|

Детальное описание протокола обмена тут: [протокол_обмена_07_04.pdf](docs/протокол_обмена_07_04.pdf).

Контрольная сумма CRC-16 - согласно стандарту ISO/IEC 3309. 
Пример [имплементации на C](docs/crc.c), [имплементация на javascript](crc16iec.js).

# Tiny emulator of CE2727A power meter for RS485/RS232

Emulator supports emulation of 3 basic enquiry commands:
- Get meter information
- Get date/time
- Get consumed energy

It is made purely for testing IoT device made for reading meter values, based on [a protocol description document](docs/протокол_обмена_07_04.pdf) found in the internet.

## Quick way to results
- Create ```.env``` file, set RS485/RS232 connection params there. Example is in ```.env_example``` file. 
Defaults are: 9600, bits: 1 start, 8 data, 1 stop, even parity.
- ```npm init```
- ```npm start```

## General request/response frame structure

For both request and response the frame structure is similar:

| 0x02 | N | Network address | Password | COM | ID | DATA | CRC16 |
|---|---|---|---|---|---|---|---|

[Detailed data transfer protocol is here (in Russian)](docs/протокол_обмена_07_04.pdf).

Note: CRC16 - ISO/IEC 3309. Sample [implementation in C is here](docs/crc.c), [implementation in Javascript is here](crc16iec.js).
