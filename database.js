import 'dotenv/config';
import https from 'node:https';
import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  joblink: { type: String, required: true },
  company: String,
  e_count: Number,
  postedtime: String,
  postTime: String,
  designation: String,
  followersCount: Number,
  location: String,
  companyLink: String,
  postId: { type: Number, required: true, unique: true },
  companylog: String,
}, { timestamps: true });

const Job = mongoose.model('jobs_1', jobSchema);

const chatUserSchema = new mongoose.Schema({
  senderId: { type: String, required: true, unique: true, maxlength: 80 },
  name: { type: String, required: true, maxlength: 60 },
  lastSeen: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

const ChatUser = mongoose.model('chat_users', chatUserSchema);

const MONGODB_URI = process.env.MONGODB_URI;
const DNS_OVER_HTTPS_PROVIDERS = [
  { ip: '1.1.1.1', host: 'cloudflare-dns.com', path: '/dns-query' },
  { ip: '8.8.8.8', host: 'dns.google', path: '/resolve' }
];

const isSrvDnsError = (error) =>
  error?.syscall === 'querySrv' &&
  ['ECONNREFUSED', 'ETIMEOUT', 'ENOTFOUND', 'ESERVFAIL'].includes(error.code);

const queryDnsOverHttps = ({ ip, host, path }, name, type) => new Promise((resolve, reject) => {
  const request = https.get({
    hostname: ip,
    servername: host,
    path: `${path}?name=${encodeURIComponent(name)}&type=${type}`,
    headers: {
      Host: host,
      Accept: 'application/dns-json'
    },
    timeout: 10000
  }, response => {
    const chunks = [];

    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      try {
        if (response.statusCode !== 200) {
          throw new Error(`${host} returned HTTP ${response.statusCode}`);
        }

        const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (result.Status !== 0) {
          throw new Error(`${host} returned DNS status ${result.Status}`);
        }

        resolve(result.Answer || []);
      } catch (error) {
        reject(error);
      }
    });
  });

  request.on('timeout', () => request.destroy(new Error(`${host} request timed out`)));
  request.on('error', reject);
});

const resolveDnsOverHttps = async (name, type) => {
  let lastError;

  for (const provider of DNS_OVER_HTTPS_PROVIDERS) {
    try {
      return await queryDnsOverHttps(provider, name, type);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const decodeTxtRecord = (data) => {
  const parts = [...data.matchAll(/"([^"]*)"/g)].map(match => match[1]);
  return parts.length > 0 ? parts.join('') : data.replace(/^"|"$/g, '');
};

const buildStandardMongoUri = (srvUri, srvRecords, txtRecords) => {
  const parsedUri = new URL(srvUri);
  const hosts = srvRecords
    .filter(record => record.type === 33)
    .map(record => record.data.trim().split(/\s+/))
    .filter(parts => parts.length === 4)
    .map(parts => `${parts[3].replace(/\.$/, '')}:${parts[2]}`);

  if (hosts.length === 0) {
    throw new Error('DNS-over-HTTPS returned no MongoDB SRV hosts');
  }

  const txtOptions = txtRecords
    .filter(record => record.type === 16)
    .map(record => decodeTxtRecord(record.data))
    .join('&');
  const options = new URLSearchParams(txtOptions);

  for (const [key, value] of parsedUri.searchParams) {
    options.set(key, value);
  }
  if (!options.has('tls') && !options.has('ssl')) options.set('tls', 'true');

  const password = parsedUri.password ? `:${parsedUri.password}` : '';
  const credentials = parsedUri.username ? `${parsedUri.username}${password}@` : '';
  const query = options.toString();

  return `mongodb://${credentials}${hosts.join(',')}${parsedUri.pathname}${query ? `?${query}` : ''}`;
};

const resolveMongoSrvUri = async (srvUri) => {
  const { hostname } = new URL(srvUri);
  const [srvRecords, txtRecords] = await Promise.all([
    resolveDnsOverHttps(`_mongodb._tcp.${hostname}`, 'SRV'),
    resolveDnsOverHttps(hostname, 'TXT')
  ]);

  return buildStandardMongoUri(srvUri, srvRecords, txtRecords);
};

const connectDatabase = async () => {
  try {
    try {
      await mongoose.connect(MONGODB_URI);
    } catch (error) {
      if (!MONGODB_URI?.startsWith('mongodb+srv://') || !isSrvDnsError(error)) {
        throw error;
      }

      console.warn(`MongoDB SRV lookup failed using system DNS (${error.code}); retrying over HTTPS`);
      const standardUri = await resolveMongoSrvUri(MONGODB_URI);
      await mongoose.connect(standardUri);
    }

    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export { Job, ChatUser, connectDatabase, buildStandardMongoUri };
