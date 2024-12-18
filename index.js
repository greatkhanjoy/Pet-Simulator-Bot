// Import necessary modules
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const { setInterval } = require('timers');
require('dotenv').config();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Data storage files
const PETS_FILE = 'pets.json';
const DAILY_REWARDS_FILE = 'daily_rewards.json';
const SHOP_ITEMS = [
  { name: 'Food', price: 5, type: 'food' },
  { name: 'Toy', price: 10, type: 'item' },
];

// Load pets from JSON file
let pets = {};
if (fs.existsSync(PETS_FILE)) {
  try {
    pets = JSON.parse(fs.readFileSync(PETS_FILE));
  } catch (error) {
    console.error('Error reading pets data:', error);
  }
}

// Daily rewards tracking
let dailyRewards = {};
if (fs.existsSync(DAILY_REWARDS_FILE)) {
  try {
    dailyRewards = JSON.parse(fs.readFileSync(DAILY_REWARDS_FILE));
  } catch (error) {
    console.error('Error reading daily rewards data:', error);
  }
}

// Save pets and daily reward states to JSON file
const savePets = () => {
  try {
    fs.writeFileSync(PETS_FILE, JSON.stringify(pets, null, 2));
  } catch (error) {
    console.error('Error saving pets data:', error);
  }
};

const saveDailyRewards = () => {
  try {
    fs.writeFileSync(DAILY_REWARDS_FILE, JSON.stringify(dailyRewards, null, 2));
  } catch (error) {
    console.error('Error saving daily rewards data:', error);
  }
};

// Helper: Format pet details
const formatPet = (pet) => `🐾 **Name:** ${pet.name}\n✨ **Level:** ${pet.level}\n🍗 **Hunger:** ${pet.hunger}\n🎒 **Items:** ${pet.items.join(', ') || 'None'}`;

// Helper: Get leaderboard
const getLeaderboard = () => {
  const leaderboard = Object.entries(pets)
    .sort(([, a], [, b]) => b.level - a.level)
    .map(([userId, pet]) => `<@${userId}>: **${pet.name}** (Level: ${pet.level})`)
    .join('\n');
  return leaderboard || 'No pets available.';
};

// Set up daily rewards
const claimDailyReward = (userId) => {
  if (dailyRewards[userId] && new Date().getTime() - dailyRewards[userId] < 86400000) {
    return false; // User has already claimed today
  }
  dailyRewards[userId] = new Date().getTime();
  saveDailyRewards();
  return true; // User can claim
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const [command, ...args] = message.content.slice(1).split(/\s+/);
  const userId = message.author.id;

  switch (command.toLowerCase()) {
    case 'adopt': {
      const petName = args.join(' ');
      if (!petName) return message.reply('Please specify a name for your pet!');

      if (pets[userId]) return message.reply('You already have a pet!');

      pets[userId] = { name: petName, level: 1, hunger: 0, items: [] };
      savePets();
      return message.reply(`Congratulations! You adopted a pet named **${petName}**! 🎉`);
    }

    case 'pet': {
      const pet = pets[userId];
      if (!pet) return message.reply('You don't have a pet yet! Use `!adopt` to adopt one.');

      return message.reply(formatPet(pet));
    }

    case 'feed': {
      const pet = pets[userId];
      if (!pet) return message.reply('You don't have a pet yet! Use `!adopt` to adopt one.');

      pet.hunger = Math.max(0, pet.hunger - 10);
      pet.level += 1;
      savePets();
      return message.reply(`You fed **${pet.name}**! Their hunger decreased and they leveled up! 🎉\n${formatPet(pet)}`);
    }

    case 'gift': {
      const [targetMention, ...itemArr] = args;
      const item = itemArr.join(' ');
      if (!targetMention || !item) return message.reply('Usage: `!gift @user item`.');

      const targetId = targetMention.replace(/[^0-9]/g, '');
      const targetPet = pets[targetId];
      if (!targetPet) return message.reply('The mentioned user doesn't have a pet.');

      targetPet.items.push(item);
      savePets();
      return message.reply(`You gifted **${item}** to **${targetPet.name}**! 🎁`);
    }

    case 'contest': {
      const entries = Object.entries(pets);
      if (entries.length < 2) return message.reply('Not enough pets for a contest!');

      const winner = entries[Math.floor(Math.random() * entries.length)];
      return message.reply(`The winner of the "Cutest Pet Contest" is **${winner[1].name}**! 🎉`);
    }

    case 'battle': {
      const [opponentMention] = args;
      if (!opponentMention) return message.reply('Usage: `!battle @opponent`.');

      const opponentId = opponentMention.replace(/[^0-9]/g, '');
      const userPet = pets[userId];
      const opponentPet = pets[opponentId];

      if (!userPet || !opponentPet) return message.reply('Both participants must have a pet!');

      const userScore = userPet.level + Math.random() * 10;
      const opponentScore = opponentPet.level + Math.random() * 10;

      const winner = userScore > opponentScore ? message.author.username : `<@${opponentId}>`;
      return message.reply(`The winner of the battle is **${winner}**! 🎉`);
    }

    case 'dailyreward': {
      if (claimDailyReward(userId)) {
        const food = 'Food'; // You can change the type or randomize it
        if (pets[userId]) {
          pets[userId].items.push(food);
          savePets();
          return message.reply(`You claimed your daily reward: **${food}**! 🎉`);
        }
        return message.reply(`You claimed your daily reward: **${food}**! But you don't have a pet yet.`);
      } else {
        return message.reply('You have already claimed your daily reward. Please come back tomorrow!');
      }
    }

    case 'shop': {
      const shopList = SHOP_ITEMS.map(item => `🛒 **${item.name}** - Price: ${item.price} coins`).join('\n');
      return message.reply(`Welcome to the shop! Here's what you can buy:\n${shopList}`);
    }

    case 'buy': {
      const itemName = args.join(' ');
      const item = SHOP_ITEMS.find(i => i.name.toLowerCase() === itemName.toLowerCase());

      if (!item) return message.reply('Item not found in the shop.');

      if (!pets[userId]) return message.reply('You need to adopt a pet first!');

      // This is a placeholder for checking in-bot currency
      // Assume users have starting balance of 20 coins for demo purposes
      const userCurrency = 20;

      if (userCurrency < item.price) {
        return message.reply('You do not have enough coins to buy this item.');
      }

      // Deducting coins and adding items would go here
      pets[userId].items.push(item.name);
      savePets();
      return message.reply(`You bought **${item.name}** for ${item.price} coins! 🎉`);
    }

    case 'leaderboard': {
      const leaderboard = getLeaderboard();
      return message.reply(`**Leaderboard**:\n${leaderboard || 'No pets available.'}`);
    }

    default:
      return message.reply('Unknown command. Try `!adopt`, `!pet`, `!feed`, `!gift`, `!contest`, `!battle`, `!dailyreward`, `!shop`, `!buy`, or `!leaderboard`.');
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);