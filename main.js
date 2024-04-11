const WebSocket = require('ws');

const tokens = {
    LISTENING_TOKEN: "TOKEN",
    CLAIMERS_TOKEN: "TOKEN",
    GUILD_IDS: "Sunucu ID"
};

let socket = null;
let heartbeatInterval = null;
const guilds = {};

const fetchVanityURL = async (vanityURL) => {
    const baseUrl = 'https://canary.discord.com/api/v10';
    const requestOptions = { method: 'PATCH', headers: { 'Authorization': tokens.CLAIMERS_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: vanityURL }) };
    const startTime = Date.now();
    await fetch(`${baseUrl}/guilds/${tokens.GUILD_IDS}/vanity-url`, requestOptions);
    return Date.now() - startTime;
};

const claimVanityURL = async (vanityURL) => console.log(`Claimed : [${vanityURL}] in ${await fetchVanityURL(vanityURL)}ms`);

const updateGuildListAndSendInfo = (guildData) => { guilds[guildData.id] = { vanity_url_code: guildData.vanity_url_code }; console.log(Object.values(guilds).map(g => g.vanity_url_code).filter(v => v).join(" ")); };

const onMessage = async (message) => {
    const data = JSON.parse(message);
    if (data.op === 10) {
        heartbeatInterval = setInterval(() => socket.send(JSON.stringify({ op: 0, d: null })), data.d.heartbeat_interval);
        socket.send(JSON.stringify({ op: 2, d: { token: tokens.LISTENING_TOKEN, properties: { $os: '', $browser: '', $device: '' }, intents: 513 } }));
    } else if (data.op === 0) {
        if (["GUILD_UPDATE", "GUILD_DELETE"].includes(data.t)) {
            const oldVanity = guilds[data.d.id]?.vanity_url_code;
            guilds[data.d.id] = { vanity_url_code: data.d.vanity_url_code };
            if (oldVanity && oldVanity !== data.d.vanity_url_code) claimVanityURL(oldVanity);
        } else if (["GUILD_CREATE", "GUILD_DELETE"].includes(data.t)) updateGuildListAndSendInfo(data.d);
        else if (data.t === "READY") data.d.guilds.forEach(guild => guild.vanity_url_code && (guilds[guild.id] = { vanity_url_code: guild.vanity_url_code }));
    }
};

const connectToWebSocket = () => {
    socket = new WebSocket('wss://gateway.discord.gg');
    socket.on('open', () => console.log('Connected to Discord WebSocket Gateway.'));
    socket.on('message', onMessage);
    socket.on('close', () => { console.log('WebSocket connection closed. Reconnecting...'); clearInterval(heartbeatInterval); setTimeout(connectToWebSocket, 1000); });
    socket.on('error', (error) => { console.error('WebSocket encountered an error:', error); clearInterval(heartbeatInterval); });
};

connectToWebSocket();
