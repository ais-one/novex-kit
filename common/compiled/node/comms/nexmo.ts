import crypto from 'node:crypto';

//NOSONAR
// nexmo.isms('6596935500', 'Blah ' + new Date())
// nexmo.ismsSend('6596935500', 'Blah ' + new Date())
const { NEXMO_KEY, NEXMO_SECRET, NEXMO_SENDER = 'SMSnotice' } = process.env;

/** Send an SMS via the Nexmo REST API. */
export const send = async (sms: string, message: string, from?: string) => {
  if (!from) from = NEXMO_SENDER;
  if (sms && message) {
    // just throw if failed
    await fetch(
      `https://rest.nexmo.com/sms/json?api_key=${NEXMO_KEY}&api_secret=${NEXMO_SECRET}&to=${sms}&from=${from}&text=${message}`,
    );
  }
};

/** Send an SMS via the iSMS gateway (era.sg). */
export const ismsSend = async (sms: string, message: string, from?: string) => {
  const url = 'https://sms.era.sg/isms_mt.php?';
  try {
    if (sms && message && NEXMO_SECRET) {
      const params = new URLSearchParams({
        uid: NEXMO_KEY ?? '',
        // MD5 is required by the era.sg iSMS API (pwd = md5(secret)) — external contract, not our own hashing.
        // CodeQL js/weak-cryptographic-algorithm alert dismissed as "Won't fix" for this line.
        // nosemgrep
        pwd: crypto.createHash('md5').update(NEXMO_SECRET).digest('hex'),
        dnr: sms,
        snr: from || NEXMO_SENDER,
        msg: message,
        split: '5',
      });
      return await fetch(`${url}${params}`);
    }
  } catch (e) {
    // logger.info('ismsSend', e.toString())
  }
  return null;
};
