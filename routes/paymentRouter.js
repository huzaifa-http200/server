const express = require('express');
const bodyParser = require('body-parser');
const Payments = require('../models/payment');
const authenticate = require('../authenticate');
const cors = require('./cors');
const webpush = require('web-push');

const vapidKeys = {
    "publicKey":"BETBi1VwoUlwsXTgNBk7kBOBhvcUuqtyOGDt8Z7bsyK7B6hOGTynyr5GO4kJ0ole4cmnfZ51tIDfip3rqmgRAes",
    "privateKey":"LngIwcH1_5a1c9uIby56BIyeijlKJ5qAH0df_r4iyfw"
};

webpush.setVapidDetails(
    'mailto:example@yourdomain.org',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);
fakeDatabase = []

const paymentRouter = express.Router();

paymentRouter.use(bodyParser.json());

paymentRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    Payments.find({})
    .populate('comments.author')
    .then(payments => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(payments);
    }, err => next(err))
    .catch(err => next(err));
})

.post((req, res, next) => {
    Payments.create(req.body)
    .then(payment => {
        console.log('payment Created ', payment);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(payment);
    }, err => next(err))
    .catch(err => next(err));
})

paymentRouter.route('/subscription')
.post((req, res,next) => {
    const subscription = req.body;
    fakeDatabase.push(subscription); 
})
paymentRouter.route('/notification')
.post((req, res,next) => { 
    const notificationPayload = {
        notification: {
          title: 'New Notification',
          body: 'This is the body of the notification',
          icon: 'assets/icons/icon-512x512.png'
        }
      };
    
      const promises = [];
      fakeDatabase.forEach(subscription => {
        promises.push(webpush.sendNotification(subscription, JSON.stringify(notificationPayload)));
      });
      Promise.all(promises).then(() => res.sendStatus(200));
})

.get(cors.cors, (req, res, next) => {
    Payments.find({})
    .populate('comments.author')
    .then(payments => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(payments);
    }, err => next(err))
    .catch(err => next(err));
})

.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /payments');
})

.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    // Payments.deleteMany({})
    Payments.remove({})
    .then(resp => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, err => next(err))
    .catch(err => next(err));    
});


paymentRouter.route('/:dishId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    Payments.findById(req.params.dishId)
    .populate('comments.author')
    .then(dish => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(dish);
    }, err => next(err))
    .catch(err => next(err));
})

.post(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported on /payments/'+ req.params.dishId);
})

.put(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Payments.findByIdAndUpdate(req.params.dishId,
        { $set: req.body }, 
        { new: true }
    )
    .then(dish => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(dish);
    }, err => next(err))
    .catch(err => next(err));
})

.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Payments.findByIdAndRemove(req.params.dishId)
    .then(resp => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, err => next(err))
    .catch(err => next(err));
});



paymentRouter.route('/:dishId/comments')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    Payments.findById(req.params.dishId)
    .populate('comments.author')
    .then(dish => {
        if (dish != null) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(dish.comments);
        }
        else {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, err => next(err))
    .catch(err => next(err));
})

.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Payments.findById(req.params.dishId)
    .then(dish => {
        if (dish != null) {
            req.body.author = req.user._id;
            dish.comments.push(req.body);
            dish.save()
            .then(dish => {
                Payments.findById(dish._id)
                .populate('comments.author')
                .then(dish => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(dish);
                });      
            }, err => next(err));
        }
        else {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, err => next(err))
    .catch(err => next(err));
})

.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /payments/'
        + req.params.dishId + '/comments');
})

// deleting all the subdocuments.
.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Payments.findById(req.params.dishId)
    .then(dish => {
        if (dish != null) {
            for (var i = (dish.comments.length -1); i >= 0; i--) {
                dish.comments.id(dish.comments[i]._id).remove();
            }
            dish.save()
            .then((dish) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(dish);                
            }, err => next(err));
        }
        else {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, err => next(err))
    .catch(err => next(err));    
});


paymentRouter.route('/:dishId/comments/:commentId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    Payments.findById(req.params.dishId)
    .populate('comments.author')
    .then(dish => {
        if (dish != null && dish.comments.id(req.params.commentId) != null) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(dish.comments.id(req.params.commentId));
        }
        else if (dish == null) {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err);
        }
        else {
            err = new Error('Comment ' + req.params.commentId + ' not found');
            err.status = 404;
            return next(err);            
        }
    }, err => next(err))
    .catch(err => next(err));
})

.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported on /payments/'+ req.params.dishId
        + '/comments/' + req.params.commentId);
})

.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Payments.findById(req.params.dishId)
    .then(dish => {
        if (dish.comments.id(req.params.commentId).author.equals(req.user._id) && dish != null 
            && dish.comments.id(req.params.commentId) != null) 
        {
            if (req.body.rating) {
                dish.comments.id(req.params.commentId).rating = req.body.rating;
            }
            if (req.body.comment) {
                dish.comments.id(req.params.commentId).comment = req.body.comment;                
            }
            dish.save()
            .then(dish => {
                Payments.findById(dish._id)
                .populate('comments.author')
                .then((dish) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(dish);  
                });               
            }, err => next(err));
        }
        else if (dish == null) {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err);
        }
        else if (dish.comments.id(req.params.commentId) == null) {
            err = new Error('Comment ' + req.params.commentId + ' not found');
            err.status = 404;
            return next(err);            
        }
        else{
            err = new Error('You are not authorized to update this comment!');
            err.status = 403;
            return next(err);
        }
    }, err => next(err))
    .catch(err => next(err));
})

.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Payments.findById(req.params.dishId)
    .then(dish => {
        if (dish.comments.id(req.params.commentId).author.equals(req.user._id) && dish != null
            && dish.comments.id(req.params.commentId) != null)
        {
            dish.comments.id(req.params.commentId).remove();
            dish.save()
            .then(dish => {
                Payments.findById(dish._id)
                .populate('comments.author')
                .then(dish => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(dish);  
                });              
            }, err => next(err));
        }
        else if (dish == null) {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            err.status = 404;
            return next(err);
        }
        else if (dish.comments.id(req.params.commentId) == null) {
            err = new Error('Comment ' + req.params.commentId + ' not found');
            err.status = 404;
            return next(err);            
        }
        else{
            err = new Error('You are not authorized to delete this comment!');
            err.status = 403;
            return next(err);
        }
    }, err => next(err))
    .catch(err => next(err));
});

function sendNewsletter(req, res) {

    // const allSubscriptions = ... get subscriptions from database 

    // console.log('Total subscriptions', allSubscriptions.length);

    const notificationPayload = {
        "notification": {
            "title": "Angular News",
            "body": "Newsletter Available!",
            "icon": "assets/main-page-logo-small-hat.png",
            "vibrate": [100, 50, 100],
            "data": {
                "dateOfArrival": Date.now(),
                "primaryKey": 1
            },
            "actions": [{
                "action": "explore",
                "title": "Go to the site"
            }]
        }
    };

    Promise.all(webpush.sendNotification( sub, JSON.stringify(notificationPayload)))
        .then(() => {
           return res.status(200).json({message: 'Newsletter sent successfully.'})
        })
        .catch(err => {
            console.error("Error sending notification, reason: ", err);
            return res.sendStatus(500);
        });
}

module.exports = paymentRouter;