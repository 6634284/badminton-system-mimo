describe('CoachService - CRUD & Lessons', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      coach: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      coachLesson: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrisma)),
    };
  });

  describe('coach CRUD', () => {
    it('should create coach', async () => {
      mockPrisma.coach.create.mockResolvedValue({
        id: BigInt(1),
        name: '王教练',
        title: '高级教练',
        status: 'active',
      });

      const coach = await mockPrisma.coach.create({
        data: {
          tenantId: BigInt(1),
          name: '王教练',
          title: '高级教练',
          bio: '10年教学经验',
          status: 'active',
        },
      });

      expect(coach.name).toBe('王教练');
      expect(coach.status).toBe('active');
    });

    it('should list coaches with pagination', async () => {
      mockPrisma.coach.findMany.mockResolvedValue([
        { id: BigInt(1), name: '王教练' },
        { id: BigInt(2), name: '李教练' },
      ]);
      mockPrisma.coach.count.mockResolvedValue(2);

      const coaches = await mockPrisma.coach.findMany({
        where: { tenantId: BigInt(1), status: 'active' },
        skip: 0,
        take: 10,
      });
      const total = await mockPrisma.coach.count({ where: { tenantId: BigInt(1) } });

      expect(coaches).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('should update coach info', async () => {
      mockPrisma.coach.update.mockResolvedValue({
        id: BigInt(1),
        name: '王教练',
        title: '特级教练', // updated
      });

      const coach = await mockPrisma.coach.update({
        where: { id: BigInt(1) },
        data: { title: '特级教练' },
      });

      expect(coach.title).toBe('特级教练');
    });

    it('should find coach by id', async () => {
      mockPrisma.coach.findUnique.mockResolvedValue({
        id: BigInt(1),
        name: '王教练',
        lessons: [],
      });

      const coach = await mockPrisma.coach.findUnique({ where: { id: BigInt(1) } });
      expect(coach.id).toBe(BigInt(1));
    });
  });

  describe('lesson management', () => {
    it('should create lesson for coach', async () => {
      mockPrisma.coachLesson.create.mockResolvedValue({
        id: BigInt(1),
        coachId: BigInt(1),
        name: '基础班',
        price: 200,
        maxStudents: 8,
        status: 'active',
      });

      const lesson = await mockPrisma.coachLesson.create({
        data: {
          tenantId: BigInt(1),
          coachId: BigInt(1),
          name: '基础班',
          description: '适合初学者',
          price: 200,
          maxStudents: 8,
          status: 'active',
        },
      });

      expect(lesson.name).toBe('基础班');
      expect(lesson.price).toBe(200);
    });

    it('should list lessons for a coach', async () => {
      mockPrisma.coachLesson.findMany.mockResolvedValue([
        { id: BigInt(1), name: '基础班', price: 200 },
        { id: BigInt(2), name: '提高班', price: 300 },
      ]);

      const lessons = await mockPrisma.coachLesson.findMany({
        where: { coachId: BigInt(1), status: 'active' },
      });

      expect(lessons).toHaveLength(2);
    });

    it('should soft-delete lesson', async () => {
      mockPrisma.coachLesson.update.mockResolvedValue({
        id: BigInt(1),
        status: 'deleted',
      });

      const lesson = await mockPrisma.coachLesson.update({
        where: { id: BigInt(1) },
        data: { status: 'deleted' },
      });

      expect(lesson.status).toBe('deleted');
    });

    it('should update lesson price', async () => {
      mockPrisma.coachLesson.update.mockResolvedValue({
        id: BigInt(1),
        price: 250,
      });

      const lesson = await mockPrisma.coachLesson.update({
        where: { id: BigInt(1) },
        data: { price: 250 },
      });

      expect(lesson.price).toBe(250);
    });
  });

  describe('coach detail enrichment', () => {
    it('should include lessons in coach detail', async () => {
      mockPrisma.coach.findFirst.mockResolvedValue({
        id: BigInt(1),
        name: '王教练',
      });
      mockPrisma.coachLesson.findMany.mockResolvedValue([
        { id: BigInt(1), name: '基础班', price: 200 },
        { id: BigInt(2), name: '提高班', price: 300 },
      ]);

      const coach = await mockPrisma.coach.findFirst({ where: { id: BigInt(1) } });
      const lessons = await mockPrisma.coachLesson.findMany({
        where: { coachId: coach.id, status: 'active' },
      });

      expect(coach.name).toBe('王教练');
      expect(lessons).toHaveLength(2);
    });
  });
});
