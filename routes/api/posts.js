const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Profile = require('../../models/Profile');
const User = require('../../models/User');
const Post = require('../../models/Post');

// @route   POST api/posts
// @desc    Create A Post
// @access  Private
router.post(
    '/',
    [auth, [check('text', 'Text is required').not().isEmpty()]],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findById(req.user.id).select('-password');

            const newPost = new Post({
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            });

            const post = await newPost.save();

            res.json(post);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

// @route   GET api/posts
// @desc    Get All Posts
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });

        if (!posts) {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }

        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/posts:id
// @desc    Get Post by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const id = req.params.id;
        const post = await Post.findById(id);

        if (!post) {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }

        res.json(post);
    } catch (err) {
        console.error(err.message);
        if (err.kind == 'ObjectId') {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/posts:id
// @desc    Delete Post
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const id = req.params.id;
        const post = await Post.findById(id);

        if (!post) {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }

        // Check User
        if (post.user.toString() !== req.user.id) {
            return res.status(401).json({
                msg: 'User Not Authorized'
            });
        }

        await post.remove();

        res.json({ msg: 'Post Removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind == 'ObjectId') {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/posts/like/:id
// @desc    Like A Post
// @access  Private
router.put('/like/:id', auth, async (req, res) => {
    try {
        const id = req.params.id;
        const post = await Post.findById(id);

        if (!post) {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }

        // Check if the post has already been liked
        if (
            post.likes.filter((like) => like.user.toString() === req.user.id)
                .length > 0
        ) {
            return res.status(400).json({
                msg: 'Post Already Liked'
            });
        }

        post.likes.unshift({ user: req.user.id });

        await post.save();

        res.json(post.likes);
    } catch (err) {
        console.error(err.message);
        if (err.kind == 'ObjectId') {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/posts/unlike/:id
// @desc    Like A Post
// @access  Private
router.put('/unlike/:id', auth, async (req, res) => {
    try {
        const id = req.params.id;
        const post = await Post.findById(id);

        if (!post) {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }

        // Check if the post has already been liked
        if (
            post.likes.filter((like) => like.user.toString() === req.user.id)
                .length === 0
        ) {
            return res.status(400).json({
                msg: 'Post has not yet been liked'
            });
        }

        // Get Remove Index
        const removeIndex = post.likes
            .map((like) => like.user.toString())
            .indexOf(req.user.id);

        post.likes.splice(removeIndex, 1);

        await post.save();

        res.json({ msg: 'Unlike Post' });
    } catch (err) {
        console.error(err.message);
        if (err.kind == 'ObjectId') {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/posts/comment/:id
// @desc    Comment on a Post
// @access  Private
router.post(
    '/comment/:id',
    [auth, [check('text', 'Text is required').not().isEmpty()]],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const id = req.params.id;
            const user = await User.findById(req.user.id).select('-password');
            const post = await Post.findById(id);

            if (!post) {
                return res.status(400).json({
                    msg: 'Post Not Found'
                });
            }

            const newComment = {
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            };

            post.comments.unshift(newComment);

            await post.save();

            res.json(post.comments);
        } catch (err) {
            console.error(err.message);
            if (err.kind == 'ObjectId') {
                return res.status(400).json({
                    msg: 'Post Not Found'
                });
            }
            res.status(500).send('Server Error');
        }
    }
);

// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    Comment on a Post
// @access  Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
    try {
        const id = req.params.id;
        const comment_id = req.params.comment_id;

        const post = await Post.findById(id);

        if (!post) {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }

        // Pull out comment
        const comment = post.comments.find(
            (comment) => comment.id === comment_id
        );

        //Make sure comment exists
        if (!comment) {
            return res.status(400).json({
                msg: 'Comment Does Not Exist'
            });
        }

        // Check user
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({
                msg: 'User Not Authorized'
            });
        }

        // Get Remove Index
        const removeIndex = post.comments
            .map((comment) => comment.user.toString())
            .indexOf(req.user.id);

        post.comments.splice(removeIndex, 1);

        await post.save();

        res.json({ msg: 'Comment Deleted' });
    } catch (err) {
        console.error(err.message);
        if (err.kind == 'ObjectId') {
            return res.status(400).json({
                msg: 'Post Not Found'
            });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
