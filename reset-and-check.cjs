const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://pasimenzis_db_user:qVJ6jJzMMciUsNRF@voug.jjgvc45.mongodb.net/?appName=voug';

async function resetQuote() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const quotesCollection = db.collection('quotes');
  
  const quoteId = new mongoose.Types.ObjectId('69b51e6a1ca46c772c956322');
  
  // Reset to approved
  console.log('Resetting quote to approved status...');
  await quotesCollection.updateOne(
    { _id: quoteId },
    { 
      $set: { status: 'approved' },
      $unset: { agentDetails: 1, agentDetailsAddedAt: 1, agentDetailsAddedBy: 1 }
    }
  );
  
  const quote = await quotesCollection.findOne({ _id: quoteId });
  console.log('After reset:');
  console.log('  Status:', quote?.status);
  console.log('  supplierDetails:', quote?.supplierDetails);
  console.log('  agentDetails:', quote?.agentDetails);
  
  await mongoose.connection.close();
  console.log('\nQuote is now ready for testing. Try submitting agent details again.');
}

resetQuote().catch(console.error);
