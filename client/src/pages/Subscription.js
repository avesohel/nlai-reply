import React from 'react';
import { CreditCard } from 'lucide-react';

const Subscription = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <CreditCard className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Subscription Management</h1>
          <p className="text-gray-600">Manage your subscription plan and billing information</p>
          <div className="mt-8">
            <p className="text-sm text-gray-500">This page is under development</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;