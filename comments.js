// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

// Create web server
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Comment data structure
const commentsByPostId = {};

// Route handler
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Route handler
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = require('crypto')
    .randomBytes(4)
    .toString('hex');

  const { content } = req.body;

  // Get comments for post
  const comments = commentsByPostId[req.params.id] || [];

  // Add new comment
  comments.push({ id: commentId, content, status: 'pending' });

  // Set comments for post
  commentsByPostId[req.params.id] = comments;

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });

  // Send response
  res.status(201).send(comments);
});

// Route handler
app.post('/events', async (req, res) => {
  console.log('Event Received:', req.body.type);

  // Get data from event
  const { type, data } = req.body;

  // If event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get comments for post
    const comments = commentsByPostId[data.postId];

    // Find comment
    const comment = comments.find((comment) => {
      return comment.id === data.id;
    });

    // Update comment status
    comment.status = data.status;

    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { ...comment, postId: data.postId },
    });
  }

  // Send response
  res.send({});
});

// Listen on port
app.listen(4001, () => {
  console.log('Comments service listening on port 4001...');
});