const express = require('express');
const cors = require('cors'); const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yhwb0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const database = client.db('college')
    const allcollegeCollection = database.collection('all-college');
    const admissionCollection = database.collection('admission');
    const reviewCollection = database.collection('review');
    const userCollection = database.collection('user');


    app.get('/all-college', async (req, res) => {
      try {
        const colleges = await allcollegeCollection.find().toArray()
        res.send(colleges)
      }
      catch (error) {
        res.status(500).send({ message: "Error fetching colleges" })
      }
    })

    app.delete('/colleges/:id', async (req, res) => {
      const id = req.params.id;
      const result = await allcollegeCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });



    app.get('/college/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const college = await allcollegeCollection.findOne({ _id: new ObjectId(id) });

        if (!college) {
          return res.status(404).send({ message: 'College not found' });
        }

        res.send(college);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching college details' });
      }
    });


    app.post('/colleges', async (req, res) => {
      try {
        const {
          name,
          image,
          rating,
          admissionDate,
          researchCount,
          events,
          sports
        } = req.body;

        // Basic validation (optional)
        if (!name || !image || !rating || !admissionDate || !researchCount) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const newCollege = {
          name,
          image,
          rating: parseFloat(rating),
          admissionDate,
          researchCount: parseInt(researchCount),
          events: Array.isArray(events) ? events : [],
          sports: Array.isArray(sports) ? sports : [],
          createdAt: new Date()
        };

        const result = await allcollegeCollection.insertOne(newCollege);
        res.status(201).json({ success: true, insertedId: result.insertedId });

      } catch (error) {
        console.error('Error saving college:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });



    app.post('/admission', async (req, res) => {
      try {
        const admissionData = req.body;
        const result = await admissionCollection.insertOne(admissionData);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to save admission data' });
      }
    });


    app.get('/admissions', async (req, res) => {
      const userEmail = req.query.userEmail;
      if (!userEmail) return res.status(400).send({ message: 'Missing userEmail' });

      try {
        const admissions = await admissionCollection.find({ userEmail }).toArray();
        res.send(admissions);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch admissions' });
      }
    });

    app.get('/admin/admissions', async (req, res) => {
      try {
        const admissions = await admissionCollection.find().toArray();
        res.send(admissions);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch admissions' });
      }
    });

    app.patch('/admin/admission/:id', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body; // true for accepted, false for rejected

      if (typeof status !== 'boolean') {
        return res.status(400).send({ message: 'Invalid status value' });
      }

      try {
        const result = await admissionCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: status } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Admission not found' });
        }

        res.send({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).send({ message: 'Failed to update status' });
      }
    });

    // Delete an admission
    app.delete('/admin/admission/:id', async (req, res) => {
      const id = req.params.id;

      try {
        const result = await admissionCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Admission not found' });
        }

        res.send({ success: true, deletedCount: result.deletedCount });
      } catch (error) {
        res.status(500).send({ message: 'Failed to delete admission' });
      }
    });

    app.post('/review', async (req, res) => {
      const { userEmail, collegeName, rating, feedback } = req.body;

      if (!userEmail || !collegeName || !rating || !feedback) {
        return res.status(400).send({ message: 'Missing required fields' });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).send({ message: 'Rating must be between 1 and 5' });
      }

      try {
        const reviewDoc = {
          userEmail,
          collegeName,
          rating,
          feedback,
          createdAt: new Date(),
        };
        const result = await reviewCollection.insertOne(reviewDoc);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: 'Failed to save review' });
      }
    });

    app.get('/reviews', async (req, res) => {
      try {
        const reviews = await reviewCollection.find().toArray();
        res.send(reviews);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch reviews' });
      }
    });


    app.post('/users', async (req, res) => {
      const { name, email, location } = req.body;

      if (!name || !email) {
        return res.status(400).send({ message: "Name, email and location are required" });
      }


      const existingUser = await userCollection.findOne({ email });

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }


      const result = await userCollection.insertOne({ name, email, location });
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.patch('/users/:id', async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;

      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      res.send(result);
    });

     app.get('/users/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const user = await userCollection.findOne({ email });
        if (!user) return res.status(404).send({ message: 'User not found' });
        res.send(user);  
      } catch (error) {
        res.status(500).send({ message: 'Server error' });
      }
    });



  app.get('/all-searched-college', async (req, res) => {
      try {
        const search = req.query.name;

        const query = search
          ? { name: { $regex: search, $options: 'i' } }
          : {};

        const colleges = await allcollegeCollection.find(query).toArray();
        res.send(colleges);
      } catch (error) {
        res.status(500).send({ message: "Error fetching colleges", error });
      }
    });


  













    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("Server is running")
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

