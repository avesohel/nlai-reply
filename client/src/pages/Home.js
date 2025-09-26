import React from 'react';
import { Link } from 'react-router-dom';
import { YouTube, MessageSquare, BarChart3, Shield, Zap, Users } from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: <MessageSquare className="h-8 w-8 text-primary-600" />,
      title: 'Smart Reply Templates',
      description: 'Create custom reply templates with variables and conditions for automated responses.'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary-600" />,
      title: 'Analytics Dashboard',
      description: 'Track your reply performance with detailed analytics and insights.'
    },
    {
      icon: <Shield className="h-8 w-8 text-primary-600" />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with reliable YouTube API integration.'
    },
    {
      icon: <Zap className="h-8 w-8 text-primary-600" />,
      title: 'Lightning Fast',
      description: 'Respond to comments in seconds with our automated reply system.'
    },
    {
      icon: <Users className="h-8 w-8 text-primary-600" />,
      title: 'Multiple Channels',
      description: 'Manage multiple YouTube channels from a single dashboard.'
    },
    {
      icon: <YouTube className="h-8 w-8 text-primary-600" />,
      title: 'YouTube Integration',
      description: 'Direct integration with YouTube API for seamless comment management.'
    }
  ];

  const plans = [
    {
      name: 'Basic',
      price: '$9.99',
      features: ['100 replies/month', '1 YouTube channel', 'Basic templates', 'Email support']
    },
    {
      name: 'Pro',
      price: '$29.99',
      features: ['500 replies/month', '5 YouTube channels', 'Advanced templates', 'Priority support', 'Analytics']
    },
    {
      name: 'Enterprise',
      price: '$99.99',
      features: ['2000 replies/month', '25 YouTube channels', 'Custom templates', 'Premium support', 'Advanced analytics']
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Automate Your YouTube Comment Replies
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Save time and engage with your audience efficiently using AI-powered reply templates and smart automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-3 text-lg">
              Start Free Trial
            </Link>
            <Link to="/login" className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3 text-lg">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Content Creators
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage your YouTube comments efficiently and grow your community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your needs. All plans include a 7-day free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div key={index} className={`card text-center ${index === 1 ? 'ring-2 ring-primary-600 relative' : ''}`}>
                {index === 1 && (
                  <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-primary-600 mb-6">
                  {plan.price}
                  <span className="text-lg text-gray-500 font-normal">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="text-gray-600">{feature}</li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`btn w-full ${index === 1 ? 'btn-primary' : 'btn-outline'}`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your YouTube Management?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of content creators who are saving time and growing their communities with our platform.
          </p>
          <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-3 text-lg">
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;