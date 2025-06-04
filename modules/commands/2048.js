module.exports.config = {
	name: "dev",
	version: "1.0.1", 
	hasPermssion: 0,
	credits: "Joshua Sy", // من فضلك لا تغير الحقوق
	description: "معلومات البوت والمطور",
	commandCategory: "GROUP",
	cooldowns: 1,
	dependencies: {
		"request": "",
		"fs-extra": ""
	}
};

module.exports.run = async function({ api, event }) {
	const fs = global.nodemodule["fs-extra"];
	const request = global.nodemodule["request"];
	const moment = require("moment-timezone");

	const currentTime = moment.tz("Africa/Algiers").format("D/MM/YYYY HH:mm:ss");
	const imageUrl = "https://iimg.su/s/13/YZotCuU7DtyUb0PNNpf10WhoUWYO7QeU7Ivr6m7F.jpg";
	const imgPath = __dirname + "/cache/dev.jpg";

	const callback = () => {
		api.sendMessage({
			body: `معلومات المطور:

الاسم: عزيز JR
الوقت الحالي: ${currentTime}

حساب الفيسبوك:
https://www.facebook.com/profile.php?id=61574966754078

صاحب ومطور البوت.
شكراً لاستخدامك البوت.`,
			attachment: fs.createReadStream(imgPath)
		}, event.threadID, () => fs.unlinkSync(imgPath));
	};

	request(encodeURI(imageUrl)).pipe(fs.createWriteStream(imgPath)).on("close", callback);
};
