import Topbar from '../components/layout/Topbar';
import { Leaf, Info, ShieldCheck, Activity, Database, Cpu } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="About Us" breadcrumbs={[{ label: 'About Us' }]} />
      <div className="p-6 max-w-[1440px] mx-auto space-y-6 pb-12">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden glass border border-border p-8 lg:p-12 mesh-bg">
          <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <Leaf size={240} className="text-brand" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-medium mb-6">
              <Info size={16} /> Version 1.0.0
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-text-primary mb-4 leading-tight">
              Sustainable Energy<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-info">Monitoring System</span>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed">
              SEMS is a next-generation platform designed to revolutionize how smart cities manage, monitor, and optimize energy consumption. By integrating real-time IoT sensor data, advanced predictive analytics, and intuitive visualization, SEMS empowers administrators to make data-driven decisions that reduce carbon footprints and improve urban sustainability.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard 
            icon={Activity} 
            title="Real-Time Telemetry" 
            desc="Continuous monitoring of energy usage across municipal zones and buildings with millisecond latency."
            delay="delay-1"
          />
          <FeatureCard 
            icon={Cpu} 
            title="IoT Integration" 
            desc="Seamlessly connects with thousands of smart meters, HVAC systems, and grid sensors."
            delay="delay-2"
          />
          <FeatureCard 
            icon={Database} 
            title="Predictive AI" 
            desc="Leveraging machine learning models to forecast peak loads and detect anomalous consumption."
            delay="delay-3"
          />
          <FeatureCard 
            icon={ShieldCheck} 
            title="Enterprise Security" 
            desc="Role-based access control and encrypted pipelines ensure critical infrastructure data remains secure."
            delay="delay-4"
          />
        </div>

        {/* Technical Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass border border-border rounded-2xl p-8 hover-lift card-animate delay-3">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center">
                <Leaf size={18} className="text-brand" />
              </div>
              Our Mission
            </h2>
            <p className="text-text-secondary leading-relaxed">
              The core mission of SEMS is to bridge the gap between complex energy infrastructure and actionable insights. We aim to help modern municipalities transition towards 100% renewable energy reliance by providing transparent, highly granular metrics that highlight inefficiencies and promote conservation.
            </p>
          </div>

          <div className="glass border border-border rounded-2xl p-8 hover-lift card-animate delay-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center">
                <Database size={18} className="text-info" />
              </div>
              System Technology Structure
            </h2>
            <ul className="space-y-3 text-text-secondary">
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-brand"></span> React / Vite Frontend with Vite & Tailwind CSS</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-info"></span> Node.js / Express Backend RESTful APIs</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Data Storage layer via Prisma ORM</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-warning"></span> Complete Role-Based Access Control and Security</li>
            </ul>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-8 text-center mt-12 border-t border-border/50">
          <p className="text-sm text-text-secondary">
            Developed by <span className="font-semibold text-brand">Kevin Umrigar</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, delay }) {
  return (
    <div className={`glass border border-border p-6 rounded-2xl hover-lift card-animate ${delay}`}>
      <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-5 border border-brand/20">
        <Icon size={24} />
      </div>
      <h3 className="text-white font-medium mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
    </div>
  );
}
