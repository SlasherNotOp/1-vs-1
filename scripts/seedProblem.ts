import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const problem = await prisma.problem.create({
    data: {
      title: 'Sum of Two Numbers',
      description: 'You are given two integers a and b. Write a program to return their sum.',
      difficulty: 'Easy',
      exampleInput: '3 5',
      exampleOutput: '8',
      testCases: {
        create: [
          {
            input: '3 5',
            output: '8',
          },
          {
            input: '10 -4',
            output: '6',
          },
          {
            input: '-1000000 1000000',
            output: '0',
          },
          {
            input: '123 456',
            output: '579',
          },
        ],
      },
    },
  });

  console.log('Problem inserted:', problem);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
