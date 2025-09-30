// index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v1r7xwf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to MongoDB and define routes
async function run() {
  try {
    await client.connect();

    const db = client.db("mcmsDB");
    const usersCollection = db.collection("users");
    const campsCollection = db.collection("camps");
    const registrationsCollection = db.collection("registrations");
    // Users routes
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch users", error });
      }
    });

   app.post("/users", async (req, res) => {
  try {
    const newUser = req.body;
    const existingUser = await usersCollection.findOne({ email: newUser.email });
    if (existingUser) {
      return res.send({ message: "User already exists" });
    }
    const result = await usersCollection.insertOne(newUser);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to add user", error });
  }
});



    
// GET all camps for Organizer
app.get("/organizer-camps/:organizerEmail", async (req, res) => {
  const { organizerEmail } = req.params;
  try {
    const organizerCamps = await campsCollection.find({ organizerEmail }).toArray();
    res.send(organizerCamps);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch organizer camps", error });
  }
});

// UPDATE a camp
app.patch("/update-camp/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    const result = await campsCollection.updateOne(
      { _id: new require("mongodb").ObjectId(id) },
      { $set: updateData }
    );
    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ success: false, error });
  }
});

// DELETE a camp
app.delete("/delete-camp/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await campsCollection.deleteOne({ _id: new require("mongodb").ObjectId(id) });
    res.send({ success: true, result });
  } catch (error) {
    res.status(500).send({ success: false, error });
  }
});

// GET all registered participants
app.get("/registered-camps/:organizerEmail", async (req, res) => {
  const { organizerEmail } = req.params;
  try {
    const registrations = await registrationsCollection
      .find({ organizerEmail })
      .toArray();
    res.send(registrations);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch registrations", error });
  }
});

    
    app.get("/camps", async (req, res) => {
      try {
        const sortField = req.query.sort; // e.g., participants
        const limit = parseInt(req.query.limit) || 0; // optional limit
        const sortQuery = sortField ? { [sortField]: -1 } : {};

        const camps = await campsCollection
          .find()
          .sort(sortQuery)
          .limit(limit)
          .toArray();

        res.send(camps);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch camps", error });
      }
    });

    // POST a new camp (Organizer)
    app.post("/camps", async (req, res) => {
      try {
        const newCamp = req.body;
        newCamp.participants = newCamp.participants || 0; // default 0
        const result = await campsCollection.insertOne(newCamp);
        res.send({ success: true, result });
      } catch (error) {
        res.status(500).send({ success: false, message: "Failed to add camp", error });
      }
    });

    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("Server is running...");
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is listening on port ${port}`);
});
