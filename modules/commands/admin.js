const scdl = require('soundcloud-downloader').default
const fs = require('fs')
const path = require('path')
const axios = require('axios')

module.exports.config = {
    name: "سمعني",
    version: "1.0.2",
    hasPermssion: 0,
    credits: "ميكاسا",
    description: "بحث وتنزيل الأغاني من SoundCloud",
    commandCategory: "موسيقى",
    usages: "[اسم الأغنية]",
    cooldowns: 5,
};

const searchResults = {};

async function searchTracks(keyword, limit = 5) {
    const searchResult = await scdl.search({
        query: keyword,
        limit: limit,
        resourceType: 'tracks'
    });

    if (!searchResult || !searchResult.collection || searchResult.collection.length === 0) {
        return [];
    }

    return searchResult.collection.map(track => ({
        title: track.title,
        artist: track.user.username,
        duration: formatDuration(track.duration),
        url: track.permalink_url,
        playCount: track.playback_count,
        likeCount: track.likes_count
    }));
}

async function downloadTrack(url) {
    const track = await scdl.getInfo(url);
    const stream = await scdl.downloadFormat(url, 'audio/mpeg');

    const fileName = `${track.user.username} - ${track.title}.mp3`.replace(/[/\\?%*:|"<>]/g, '-');
    const filePath = path.join(__dirname, fileName);

    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        stream.on('end', () => resolve({ ...track, filePath }));
        stream.on('error', reject);
    });
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const keyword = args.join(" ");

    if (!keyword) {
        return api.sendMessage("من فضلك، اكتب اسم الأغنية باش نقلبولك.", threadID, messageID);
    }

    try {
        const tracks = await searchTracks(keyword);
        if (tracks.length === 0) {
            return api.sendMessage("ماعنديش الأغنية هذي. جرب حاجة أخرى.", threadID, messageID);
        }

        let msg = "🎧 **نتائج البحث**:\n\n";
        tracks.forEach((track, index) => {
            msg += `**${index + 1}.** ${track.title} \n 👤 **الفنان:** ${track.artist}\n\n`;
        });
        msg += "رد على الرقم باش تحمل الأغنية.";

        searchResults[senderID] = tracks;

        return api.sendMessage(msg, threadID, (error, info) => {
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                type: "result"
            });
        }, messageID);
    } catch (error) {
        console.error(error);
        return api.sendMessage("كاين خطأ في البحث على الأغنية.", threadID, messageID);
    }
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;

    if (handleReply.author != senderID) return;

    const choice = parseInt(body);
    if (isNaN(choice) || choice <= 0 || choice > searchResults[senderID].length) {
        return api.sendMessage("الاختيار موش صحيح.", threadID, messageID);
    }

    const selectedTrack = searchResults[senderID][choice - 1];

    api.unsendMessage(handleReply.messageID);

    try {
        const downloadResult = await downloadTrack(selectedTrack.url);
        const attachment = fs.createReadStream(downloadResult.filePath);

        const trackInfo = `
🎵 **الأغنية**: ${downloadResult.title}
🎤 **الفنان**: ${downloadResult.user.username}
⏱ **المدة**: ${formatDuration(downloadResult.duration)}
👁 **عدد المشاهدات**: ${downloadResult.playback_count.toLocaleString()}
❤ **عدد الإعجابات**: ${downloadResult.likes_count.toLocaleString()}
        `.trim();

        await api.sendMessage(
            {
                body: trackInfo,
                attachment: attachment
            },
            threadID,
            () => fs.unlinkSync(downloadResult.filePath),
            messageID
        );
    } catch (error) {
        console.error(error);
        return api.sendMessage("كاين خطأ في تحميل الأغنية.", threadID, messageID);
    }

    delete searchResults[senderID];
};
