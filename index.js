import express from "express";
import Stripe from "stripe";
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

async function run() {
  try {

    await client.connect();
    console.log("✅ Connected to MongoDB");


    const db = client.db("mcmsDB");
    const usersCollection = db.collection("users");
    const campsCollection = db.collection("camps");
    const registrationsCollection = db.collection("registrations");



    // GET all users
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch users", error });
      }
    });

    // GET single user by email
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).send({ message: "Failed to fetch user", error });
      }
    });

    // ✅ GET user role by email
    app.get("/users/role/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne(
          { email },
          { projection: { role: 1, _id: 0 } } // only return role field
        );

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ role: user.role });
      } catch (error) {
        console.error("Error fetching user role:", error);
        res.status(500).send({ message: "Failed to fetch role", error });
      }
    });



    // POST a new user
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

    // PATCH: Update user profile
    app.patch("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const updateData = req.body;

        const result = await usersCollection.updateOne(
          { email },
          { $set: updateData },
          { upsert: true }
        );

        res.send({ success: true, result });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({ success: false, message: "Failed to update user", error });
      }
    });


    

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, participantEmail, campId } = req.body;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      payment_method_types: ["card"],
      metadata: {
        participantEmail,
        campId,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});




    // GET camps (with optional sorting & limit)
    app.get("/camps", async (req, res) => {
      try {
        const sortField = req.query.sort;
        const limit = parseInt(req.query.limit) || 0;
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

    // POST new camp
    app.post("/camps", async (req, res) => {
      try {
        const newCamp = req.body;
        newCamp.participants = newCamp.participants || 0;

        const result = await campsCollection.insertOne(newCamp);
        res.send({ success: true, result });
      } catch (error) {
        res.status(500).send({ success: false, message: "Failed to add camp", error });
      }
    });

    // GET all camps for specific organizer
    app.get("/organizer-camps/:organizerEmail", async (req, res) => {
      try {
        const { organizerEmail } = req.params;
        const organizerCamps = await campsCollection.find({ organizerEmail }).toArray();
        res.send(organizerCamps);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch organizer camps", error });
      }
    });

    // GET single camp by ID
    app.get("/camps/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const camp = await campsCollection.findOne({ _id: new ObjectId(id) });

        if (!camp) {
          return res.status(404).send({ message: "Camp not found" });
        }

        res.send(camp);
      } catch (error) {
        console.error("Error fetching camp:", error);
        res.status(500).send({ message: "Failed to fetch camp", error });
      }
    });


    // UPDATE camp
    app.patch("/update-camp/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        const result = await campsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        res.send({ success: true, result });
      } catch (error) {
        res.status(500).send({ success: false, error });
      }
    });

    // DELETE camp
    app.delete("/delete-camp/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await campsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send({ success: true, result });
      } catch (error) {
        res.status(500).send({ success: false, error });
      }
    });

    // POST a new participant registration
    app.post("/registrations", async (req, res) => {
      try {
        const registration = req.body;

        // Validate required fields
        const requiredFields = [
          "campId",
          "campName",
          "campFees",
          "location",
          "healthcareProfessional",
          "participantName",
          "participantEmail",
          "age",
          "phone",
          "gender",
          "emergencyContact",
        ];

        for (const field of requiredFields) {
          if (!registration[field]) {
            return res.status(400).send({ message: `${field} is required` });
          }
        }

        // Save registration
        const result = await registrationsCollection.insertOne(registration);

        // Increment participant count in the camp
        await campsCollection.updateOne(
          { _id: new ObjectId(registration.campId) },
          { $inc: { participants: 1 } }
        );

        res.send({ success: true, message: "Registration successful", result });
      } catch (error) {
        console.error("Error registering participant:", error);
        res.status(500).send({ success: false, message: "Failed to register", error });
      }
    });


    // GET all registrations for a participant
    app.get("/registrations/participant/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const registrations = await registrationsCollection
          .find({ participantEmail: email })
          .toArray();

        // Map to clean JSON
        const cleanRegs = registrations.map((reg) => ({
          _id: reg._id.toString(),
          campId: reg.campId,
          campName: reg.campName,
          campFees: typeof reg.campFees === "object" ? parseInt(reg.campFees.$numberInt) : reg.campFees,
          location: reg.location,
          healthcareProfessional: reg.healthcareProfessional,
          participantName: reg.participantName,
          participantEmail: reg.participantEmail,
          age: reg.age,
          phone: reg.phone,
          gender: reg.gender,
          emergencyContact: reg.emergencyContact,
          paymentStatus: reg.paymentStatus || "Unpaid",
          confirmationStatus: reg.confirmationStatus || "Pending"
        }));

        res.send(cleanRegs);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch registrations", error });
      }
    });

    
    app.delete("/registrations/:id", async (req, res) => {
      try {
        const { id } = req.params;

        
        const reg = await registrationsCollection.findOne({ _id: new ObjectId(id) });
        if (!reg) return res.status(404).send({ success: false, message: "Registration not found" });

        
        const result = await registrationsCollection.deleteOne({ _id: new ObjectId(id) });

        
        await campsCollection.updateOne(
          { _id: new ObjectId(reg.campId) },
          { $inc: { participants: -1 } }
        );

        res.send({ success: true, message: "Registration cancelled successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Failed to cancel registration", error });
      }
    });




    // GET all registered participants for an organizer
    app.get("/registered-camps/:organizerEmail", async (req, res) => {
      try {
        const { organizerEmail } = req.params;
        const registrations = await registrationsCollection.find({ organizerEmail }).toArray();
        res.send(registrations);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch registrations", error });
      }
    });

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
