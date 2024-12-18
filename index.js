// Import necessary modules
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
require('dotenv').config();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Data storage files
const PETS_FILE = 'pets.json';
const DAILY_REWARDS_FILE = 'daily_rewards.json';
const SHOP_ITEMS = [
  { name: 'Food', price: 5, type: 'food' },
  { name: 'Toy', price: 10, type: 'item' },
  { name: 'Skin1', price: 15, type: 'skin' },  // Example skin item
  { name: 'Skin2', price: 20, type: 'skin' },  // Additional skin item
];

// Default skins for pets
const DEFAULT_PET_SKINS = [
  'path/to/skin1.png',
  'path/to/skin2.png',
  'path/to/skin3.png',
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
const formatPet = (pet) => `🐾 **Name:** ${pet.name}\n✨ **Level:** ${pet.level}\n🍗 **Hunger:** ${pet.hunger}\n🎒 **Items:** ${Object.entries(pet.items).map(([item, quantity]) => `${item}: ${quantity}`).join(', ') || 'None'}`;

// Set up daily rewards
const claimDailyReward = (userId) => {
  if (dailyRewards[userId] && new Date().getTime() - dailyRewards[userId] < 86400000) {
    return false; // User has already claimed today
  }

  // Generate a random reward
  const randomNum = Math.random() * 100;
  let reward;

  if (randomNum < 5) { // 5% chance for coins
    reward = { type: 'coins', amount: Math.floor(Math.random() * 20) + 1 }; // Random coin amount
    pets[userId].coins += reward.amount; // Add coins to user
  } else if (randomNum < 90) { // 85% chance for food
    reward = { type: 'food', amount: 1 }; // Always 1 food
    pets[userId].items['Food'] = (pets[userId].items['Food'] || 0) + 1; // Increment food count
  } else { // 10% chance for a toy
    reward = { type: 'toy', amount: 1 }; // Always 1 toy
    pets[userId].items['Toy'] = (pets[userId].items['Toy'] || 0) + 1; // Increment toy count
  }

  dailyRewards[userId] = new Date().getTime(); // Update last claimed time
  saveDailyRewards(); // Save daily rewards data

  return reward; // Return the reward for acknowledgment
};

// Randomly assign a default pet skin when adopting
const getRandomDefaultSkin = () => {
  const randomIndex = Math.floor(Math.random() * DEFAULT_PET_SKINS.length);
  return DEFAULT_PET_SKINS[randomIndex];
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Main message handler
client.on('messageCreate', (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const [command, ...args] = message.content.slice(1).split(/\s+/);
  const userId = message.author.id;

  switch (command.toLowerCase()) {
    case 'inventory': {
      const pet = pets[userId];
      if (!pet) return message.reply("You don't have a pet yet! Use `!adopt` to adopt one.");

      const inventoryList = Object.entries(pet.items).map(([item, quantity]) => `${item}: ${quantity}`).join(', ') || 'No items in your inventory.';
      return message.reply(`Your inventory:\n${inventoryList}`);
    }

    case 'coins': {
      const pet = pets[userId];
      if (!pet) return message.reply("You don't have a pet yet! Use `!adopt` to adopt one.");

      return message.reply(`You have **${pet.coins}** coins.`);
    }

    case 'adopt': {
      const petName = args.join(' ');
      if (!petName) return message.reply('Please specify a name for your pet!');

      if (pets[userId]) return message.reply('You already have a pet!');

      // Initialize the pet with a random skin and other properties
      pets[userId] = {
        name: petName,
        level: 1,
        hunger: 0,
        items: {},
        coins: 0,
        skin: getRandomDefaultSkin() // Assign a random skin
      };
      savePets();
      return message.reply(`Congratulations! You adopted a pet named **${petName}**! 🎉`);
    }

    case 'pet': {
      const pet = pets[userId];
      if (!pet) return message.reply("You don't have a pet yet! Use `!adopt` to adopt one.");

      const petImageUrl = pet.skin;  // Use the skin path assigned to the pet
      return message.reply({ content: formatPet(pet), files: [petImageUrl] });
    }

    case 'feed': {
      const pet = pets[userId];
      if (!pet) return message.reply('You don't have a pet yet! Use `!adopt` to adopt one.');

      const foodCount = pet.items['Food'] || 0;
      if (foodCount <= 0) return message.reply('You don't have any food to feed your pet!');

      // Feed the pet
      pet.hunger = Math.max(0, pet.hunger - 10);
      pet.level += 1;
      pet.items['Food'] -= 1; // Decrease food count by 1
      savePets();
      return message.reply(`You fed **${pet.name}**! Their hunger decreased and they leveled up! 🎉\n${formatPet(pet)}`);
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

      // Check if the user has enough coins
      if (pets[userId].coins < item.price) {
        return message.reply('You do not have enough coins to buy this item.');
      }

      // Handle item purchase
      if (item.type === 'skin') {
        pets[userId].skin = item.name;  // Set the new skin when bought
      } else {
        pets[userId].items[item.name] = (pets[userId].items[item.name] || 0) + 1; // Update item count
      }

      pets[userId].coins -= item.price; // Deduct item price from user coins
      savePets();
      return message.reply(`You bought **${item.name}** for ${item.price} coins! 🎉`);
    }

    case 'dailyreward': {
      const reward = claimDailyReward(userId);
      if (reward) {
        if (reward.type === 'coins') {
          return message.reply(`You claimed your daily reward: **${reward.amount} coins**! 🎉`);
        } else if (reward.type === 'food') {
          return message.reply(`You claimed your daily reward: **1 Food**! 🎉`);
        } else if (reward.type === 'toy') {
          return message.reply(`You claimed your daily reward: **1 Toy**! 🎉`);
        }
      } else {
        return message.reply('You have already claimed your daily reward. Please come back tomorrow!');
      }
    }

    default:
      return message.reply('Unknown command. Try `!adopt`, `!pet`, `!feed`, `!shop`, `!buy`, or `!dailyreward`.');
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);