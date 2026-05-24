import { PrismaClient, Role, LeadStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('Seeding Gemivora CMS database...');

  const adminPassword = await hashPassword('Admin123!');

  await prisma.user.upsert({
    where: { email: 'admin@gemivora.com' },
    update: {},
    create: {
      email: 'admin@gemivora.com',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'editor@gemivora.com' },
    update: {},
    create: {
      email: 'editor@gemivora.com',
      name: 'Content Editor',
      password: await hashPassword('Editor123!'),
      role: Role.EDITOR,
    },
  });

  await prisma.themeSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  await prisma.seoSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteUrl: 'https://gemivora.com',
      siteName: 'Gemivora',
      defaultTitle: 'Gemivora — AI Agency & Software Solutions',
      defaultDescription: 'Premium AI automation and software development agency for global businesses.',
      defaultTwitterHandle: '@gemivora',
    },
  });

  const seoPages = [
    {
      path: '/',
      title: 'Gemivora — AI Agency & Software Solutions',
      description: 'Premium AI automation and software development agency. Enterprise-grade digital solutions for global businesses.',
      keywords: 'AI agency, software development, automation, SaaS',
      ogType: 'website',
    },
    {
      path: '/about',
      title: 'About Us | Gemivora',
      description: 'Learn about our team, mission, and approach to building intelligent digital products.',
      keywords: 'about gemivora, AI team, software agency',
    },
    {
      path: '/services',
      title: 'Services | Gemivora',
      description: 'AI automation, web development, SEO, chatbots, and enterprise software services.',
      keywords: 'AI services, web development, SEO agency',
    },
    {
      path: '/portfolio',
      title: 'Portfolio | Gemivora',
      description: 'Explore our latest AI projects, SaaS platforms, and case studies.',
      keywords: 'portfolio, case studies, AI projects',
    },
    {
      path: '/blog',
      title: 'Blog | Gemivora',
      description: 'Insights on AI, SEO, marketing, automation, and modern software development.',
      keywords: 'AI blog, SEO tips, software development blog',
    },
    {
      path: '/contact',
      title: 'Contact | Gemivora',
      description: 'Get in touch with our team to discuss your next AI or software project.',
      keywords: 'contact, hire AI agency',
    },
  ];

  for (const page of seoPages) {
    await prisma.seoPage.upsert({
      where: { path: page.path },
      update: page,
      create: page,
    });
  }

  await prisma.blogCategory.createMany({
    data: [
      { name: 'AI', slug: 'ai', color: '#8b5cf6' },
      { name: 'SEO', slug: 'seo', color: '#f97316' },
      { name: 'Marketing', slug: 'marketing', color: '#ec4899' },
      { name: 'Automation', slug: 'automation', color: '#2563eb' },
      { name: 'Development', slug: 'development', color: '#10b981' },
    ],
    skipDuplicates: true,
  });

  await prisma.blogTag.createMany({
    data: [
      { name: 'AI Agents', slug: 'ai-agents' },
      { name: 'Customer Support', slug: 'customer-support' },
      { name: 'Next.js', slug: 'nextjs' },
      { name: 'Automation', slug: 'automation' },
    ],
    skipDuplicates: true,
  });

  await prisma.blogPost.upsert({
    where: { slug: 'ai-agents-transform-customer-support-2025' },
    update: {},
    create: {
      slug: 'ai-agents-transform-customer-support-2025',
      title: 'How AI Agents Are Transforming Customer Support in 2025',
      excerpt: 'Discover how intelligent AI agents reduce ticket volume and improve response times.',
      content:
        '<h2>The rise of AI support</h2><p>Intelligent AI agents are reshaping how SaaS companies handle customer support at scale.</p><p>From ticket triage to autonomous resolution, teams are seeing measurable gains in CSAT and efficiency.</p>',
      category: 'AI',
      tags: ['AI Agents', 'Customer Support', 'Automation'],
      author: 'Sarah Chen',
      readingTime: 8,
      featuredImage: 'https://images.unsplash.com/photo-1677440866019-787de08854?w=800&h=500&fit=crop',
      thumbnail: 'https://images.unsplash.com/photo-1677440866019-787de08854?w=800&h=500&fit=crop',
      featured: true,
      status: 'PUBLISHED',
      publishedAt: new Date('2025-03-15'),
      date: new Date('2025-03-15'),
      seoTitle: 'How AI Agents Transform Customer Support in 2025 | Gemivora',
      seoDescription: 'Learn how AI agents reduce ticket volume and improve response times for modern SaaS support teams.',
      metaKeywords: 'AI agents, customer support, automation, SaaS',
      ogTitle: 'How AI Agents Are Transforming Customer Support in 2025',
      ogDescription: 'Discover how intelligent AI agents reduce ticket volume and improve response times.',
      ogImage: 'https://images.unsplash.com/photo-1677440866019-787de08854?w=1200&h=630&fit=crop',
    },
  });

  await prisma.portfolioProject.upsert({
    where: { slug: 'ai-support-automation' },
    update: {},
    create: {
      slug: 'ai-support-automation',
      title: 'AI Support Automation',
      category: 'AI Projects',
      industry: 'SaaS',
      technologies: ['OpenAI', 'Node.js', 'React', 'PostgreSQL'],
      thumbnail: 'https://images.unsplash.com/photo-1677440866019-787de08854?w=800&h=600&fit=crop',
      description: 'Intelligent customer support platform that reduced ticket volume by 60%.',
      results: ['60% fewer support tickets', '4.2s avg response time', '92% resolution rate'],
      tall: true,
      published: true,
    },
  });

  await prisma.service.upsert({
    where: { slug: 'ai-automation' },
    update: {},
    create: {
      slug: 'ai-automation',
      title: 'AI Automation',
      description: 'Streamline operations with intelligent workflows and custom AI agents.',
      icon: 'Bot',
      gradient: 'from-violet-500 to-purple-600',
      glow: 'rgba(139,92,246,0.35)',
      published: true,
      sortOrder: 1,
    },
  });

  await prisma.testimonial.upsert({
    where: { id: 'seed-testimonial-1' },
    update: {},
    create: {
      id: 'seed-testimonial-1',
      name: 'Sarah Mitchell',
      role: 'CEO',
      company: 'TechFlow Inc',
      review: 'Gemivora transformed our customer support with AI automation. Truly exceptional work.',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face',
      published: true,
    },
  });

  const defaultCaseStudies = [
    {
      slug: 'shopnest-seo',
      client: 'ShopNest',
      industry: 'E-Commerce',
      problem:
        'ShopNest struggled with low organic visibility, declining search rankings, and heavy reliance on paid ads that eroded margins across their multi-region storefront.',
      solution:
        'We executed a full technical SEO audit, rebuilt site architecture on Next.js, implemented schema markup, and launched a content hub targeting high-intent commercial keywords.',
      technologies: ['Next.js', 'SEMrush', 'Schema.org', 'GA4', 'Contentful'],
      results: [
        { label: 'Organic Traffic Increase', value: 300, suffix: '%' },
        { label: 'Top Keyword Rankings', value: 45, suffix: '+' },
        { label: 'Conversion Lift', value: 2.4, suffix: 'x', decimals: 1 },
      ],
      beforeMetrics: {
        label: 'Before',
        metrics: [
          { label: 'Monthly Organic Visits', value: 12, suffix: 'K' },
          { label: 'Page 1 Keywords', value: 8 },
          { label: 'Bounce Rate', value: 68, suffix: '%' },
        ],
      },
      afterMetrics: {
        label: 'After',
        metrics: [
          { label: 'Monthly Organic Visits', value: 48, suffix: 'K' },
          { label: 'Page 1 Keywords', value: 53 },
          { label: 'Bounce Rate', value: 41, suffix: '%' },
        ],
      },
      timeline: [
        { phase: '01', title: 'Audit & Discovery', duration: '2 weeks' },
        { phase: '02', title: 'Technical Fixes', duration: '3 weeks' },
        { phase: '03', title: 'Content Strategy', duration: '6 weeks' },
        { phase: '04', title: 'Launch & Monitor', duration: '4 weeks' },
      ],
      analyticsImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&h=500&fit=crop',
      beforeImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&h=500&fit=crop',
      accent: 'from-emerald-500 to-teal-500',
      sortOrder: 1,
    },
    {
      slug: 'techflow-ai-chatbot',
      client: 'TechFlow',
      industry: 'SaaS',
      problem:
        "TechFlow's support team was overwhelmed with 2,000+ monthly tickets, long response times, and inconsistent answers damaging customer satisfaction scores.",
      solution:
        'We built a GPT-powered support agent integrated with their CRM, knowledge base, and ticketing system — with human handoff and continuous learning from resolved tickets.',
      technologies: ['OpenAI', 'LangChain', 'Node.js', 'HubSpot', 'Redis'],
      results: [
        { label: 'Ticket Reduction', value: 60, suffix: '%' },
        { label: 'Avg Response Time', value: 4.2, suffix: 's', decimals: 1 },
        { label: 'CSAT Score', value: 94, suffix: '%' },
      ],
      beforeMetrics: {
        label: 'Before',
        metrics: [
          { label: 'Monthly Tickets', value: 2000, suffix: '+' },
          { label: 'Avg Response', value: 4, suffix: 'hr' },
          { label: 'CSAT', value: 72, suffix: '%' },
        ],
      },
      afterMetrics: {
        label: 'After',
        metrics: [
          { label: 'Monthly Tickets', value: 800 },
          { label: 'Avg Response', value: 4.2, suffix: 's', decimals: 1 },
          { label: 'CSAT', value: 94, suffix: '%' },
        ],
      },
      timeline: [
        { phase: '01', title: 'Data Mapping', duration: '1 week' },
        { phase: '02', title: 'Agent Training', duration: '3 weeks' },
        { phase: '03', title: 'CRM Integration', duration: '2 weeks' },
        { phase: '04', title: 'Go Live', duration: '1 week' },
      ],
      analyticsImage: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=900&h=500&fit=crop',
      beforeImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&h=500&fit=crop',
      accent: 'from-violet-500 to-purple-600',
      sortOrder: 2,
    },
    {
      slug: 'cloudmetrics-saas',
      client: 'CloudMetrics',
      industry: 'Analytics',
      problem:
        'CloudMetrics needed to launch an MVP analytics platform quickly to validate market fit, but lacked an in-house engineering team and scalable infrastructure.',
      solution:
        'We delivered a multi-tenant SaaS MVP with Stripe billing, real-time dashboards, and AWS infrastructure — from concept to production in 8 weeks.',
      technologies: ['Next.js', 'TypeScript', 'Stripe', 'AWS', 'PostgreSQL'],
      results: [
        { label: 'Time to MVP', value: 8, suffix: ' wks' },
        { label: 'Active Users', value: 500, suffix: '+' },
        { label: 'Year One ARR', value: 120, prefix: '$', suffix: 'K' },
      ],
      beforeMetrics: {
        label: 'Before',
        metrics: [
          { label: 'Product', value: 0, suffix: ' — Idea' },
          { label: 'Users', value: 0 },
          { label: 'Revenue', value: 0, prefix: '$' },
        ],
      },
      afterMetrics: {
        label: 'After',
        metrics: [
          { label: 'Product', value: 100, suffix: '% Live' },
          { label: 'Users', value: 500, suffix: '+' },
          { label: 'Revenue', value: 120, prefix: '$', suffix: 'K' },
        ],
      },
      timeline: [
        { phase: '01', title: 'Architecture', duration: '1 week' },
        { phase: '02', title: 'Core Build', duration: '4 weeks' },
        { phase: '03', title: 'Billing & Auth', duration: '2 weeks' },
        { phase: '04', title: 'Beta Launch', duration: '1 week' },
      ],
      analyticsImage: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=900&h=500&fit=crop',
      beforeImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&h=500&fit=crop',
      accent: 'from-brand-blue to-brand-cyan',
      sortOrder: 3,
    },
  ];

  for (const study of defaultCaseStudies) {
    await prisma.caseStudy.upsert({
      where: { slug: study.slug },
      update: {},
      create: { ...study, published: true },
    });
  }

  await prisma.contactLead.createMany({
    data: [
      {
        name: 'Alex Johnson',
        email: 'alex@startup.io',
        company: 'Startup.io',
        message: 'Interested in AI automation for our support team.',
        status: LeadStatus.NEW,
      },
      {
        name: 'Maria Garcia',
        email: 'maria@enterprise.com',
        company: 'Enterprise Corp',
        message: 'Looking for a full SaaS platform rebuild.',
        status: LeadStatus.CONTACTED,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed.');
  console.log('Admin login: admin@gemivora.com / Admin123!');
  console.log('Editor login: editor@gemivora.com / Editor123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
