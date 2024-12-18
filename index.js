// Import necessary modules
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
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
        
        // Check if coins are defined and accessible, default to 0 if not
        const coins = pet.coins || 0;
        
        return message.reply(`You have **${coins}** coins.`);
      }
      case 'adopt': {
        const petName = args.join(' ');
        if (!petName) return message.reply('Please specify a name for your pet!');
      
        if (pets[userId]) return message.reply('You already have a pet!');
      
        // Initialize the pet with coins and ensure items is an object
        pets[userId] = { 
          name: petName, 
          level: 1, 
          hunger: 0, 
          items: {}, // Changed to an object instead of an array
          coins: 0   // Initialize coins to 0
        };
        
        savePets();
        return message.reply(`Congratulations! You adopted a pet named **${petName}**! 🎉`);
      }

    case 'pet': {
      const pet = pets[userId];
      if (!pet) return message.reply("You don't have a pet yet! Use `!adopt` to adopt one.");
      return message.reply(formatPet(pet));
    }

    case 'feed': {
        const pet = pets[userId];
        if (!pet) return message.reply('You don\'t have a pet yet! Use `!adopt` to adopt one.');
      
        // Ensure the quantity is tracked appropriately
        const foodCount = pet.items['Food'] || 0; // Default to 0 if no food present
        if (foodCount <= 0) return message.reply('You don\'t have any food to feed your pet!');
      
        // Feed the pet
        pet.hunger = Math.max(0, pet.hunger - 10);
        pet.level += 1;
        pet.items['Food'] -= 1; // Decrease food count by 1
        savePets(); // Save the updated pet data
        return message.reply(`You fed **${pet.name}**! Their hunger decreased and they leveled up! 🎉\n${formatPet(pet)}`);
      }

    case 'gift': {
      const [targetMention, ...itemArr] = args;
      const item = itemArr.join(' ');
      if (!targetMention || !item) return message.reply('Usage: `!gift @user item`.');
      const targetId = targetMention.replace(/[^0-9]/g, '');
      const targetPet = pets[targetId];
      if (!targetPet) return message.reply('The mentioned user doesn\'t have a pet.');
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
      
        // Deduct coins and add item
        pets[userId].items[item.name] = (pets[userId].items[item.name] || 0) + 1; // Update item count
        pets[userId].coins -= item.price; // Deduct item price from user coins
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