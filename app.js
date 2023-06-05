const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const app = express();
const isValid = require("date-fns/isValid");
let db = null;
const format = require("date-fns/format");
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const checkIsStatus = (dbObject) => {
  return dbObject.status !== undefined;
};

const checkIsPriority = (dbObject) => {
  return dbObject.priority !== undefined;
};

const checkIsPriorityAndStatus = (dbObject) => {
  return dbObject.priority !== undefined && dbObject.status !== undefined;
};

const checkIsSearch_q = (dbObject) => {
  return dbObject.search_q !== undefined;
};

const checkIsCategoryAndStatus = (dbObject) => {
  return dbObject.category !== undefined && dbObject.status !== undefined;
};

const checkIsCategory = (dbObject) => {
  return dbObject.category !== undefined;
};

const checkIsCategoryAndPriority = (dbObject) => {
  return dbObject.category !== undefined && dbObject.priority !== undefined;
};

const convertTodoDetails = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

//Get QueryParameters API
app.get("/todos/", async (request, response) => {
  const requestQuery = request.query;
  const { status, priority, search_q, category } = request.query;
  let getQuery;
  let result;
  let isValid;
  switch (true) {
    case checkIsStatus(requestQuery):
      isValid =
        status === "TO DO" || status === "IN PROGRESS" || status === "DONE";
      if (isValid) {
        getQuery = `
            SELECT * FROM todo WHERE status = '${status}';
        `;
        result = await db.all(getQuery);
        response.send(
          result.map((eachObject) => convertTodoDetails(eachObject))
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case checkIsPriority(requestQuery):
      isValid =
        priority === "HIGH" || priority === "MEDIUM" || priority === "LOW";
      if (isValid) {
        getQuery = `
            SELECT * FROM todo WHERE priority = '${priority}';
        `;
        result = await db.all(getQuery);
        response.send(
          result.map((eachObject) => convertTodoDetails(eachObject))
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case checkIsPriorityAndStatus(requestQuery):
      getQuery = `
            SELECT * FROM todo WHERE priority = '${priority}' AND status = '${status}';
        `;
      result = await db.all(getQuery);
      response.send(result.map((eachObject) => convertTodoDetails(eachObject)));
      break;
    case checkIsSearch_q(requestQuery):
      getQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%';
      `;
      result = await db.all(getQuery);
      response.send(result.map((eachObject) => convertTodoDetails(eachObject)));
      break;
    case checkIsCategoryAndStatus(requestQuery):
      getQuery = `
        SELECT * FROM todo category = '${category}' AND status = '${status}';
      `;
      result = await db.all(getQuery);
      response.send(result.map((eachObject) => convertTodoDetails(eachObject)));
      break;
    case checkIsCategory(requestQuery):
      isValid =
        category === "WORK" || category === "HOME" || category === "LEARNING";
      if (isValid) {
        getQuery = `
            SELECT * FROM todo WHERE category = '${category}';
        `;
        result = await db.all(getQuery);
        response.send(
          result.map((eachObject) => convertTodoDetails(eachObject))
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case checkIsCategoryAndPriority(requestQuery):
      getQuery = `
        SELECT * FROM todo category = '${category}' AND priority = '${priority}';
      `;
      result = await db.all(getQuery);
      response.send(result.map((eachObject) => convertTodoDetails(eachObject)));
      break;
  }
});

//Get a todo API
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodo = `
        SELECT * FROM todo WHERE id = ${todoId};
    `;
  const responseQuery = await db.get(getTodo);
  response.send(convertTodoDetails(responseQuery));
});

//Get a specific date API
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const newDate = new Date(date);
  const isValidDate = isValid(newDate);
  if (isValidDate) {
    const formatDate = format(new Date(date), "yyyy-MM-dd");
    const getQuery = `
        SELECT * FROM todo WHERE due_date = '${formatDate}';
      `;
    const resultQuery = await db.all(getQuery);
    response.send(
      resultQuery.map((eachQuery) => convertTodoDetails(eachQuery))
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//post a todo API
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const newDate = new Date(dueDate);
  const isValidDate = isValid(newDate);
  switch (true) {
    case status !== "TO DO" && status !== "IN PROGRESS" && status !== "DONE":
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW":
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case category !== "WORK" && category !== "HOME" && category !== "LEARNING":
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case isValidDate === false:
      response.status(400);
      response.send("Invalid Due Date");
      break;
    default:
      const formatDate = format(new Date(dueDate), "yyyy-MM-dd");
      addQuery = `
        INSERT INTO todo(id, todo, priority, status, category, due_date)
        VALUES(${id}, '${todo}', '${priority}', '${status}', '${category}', '${formatDate}');
      `;
      await db.run(addQuery);
      response.send("Todo Successfully Added");
  }
});

//update a todo API
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let result;
  let updateQuery;
  let resultQuery;
  const requestQuery = request.body;
  const { status, priority, category, todo, dueDate } = request.body;
  const getQuery = `
        SELECT * FROM todo WHERE id = ${todoId};
    `;
  switch (true) {
    case requestQuery.status !== undefined:
      result = "Status";
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateQuery = `
                UPDATE todo SET status = '${status}' WHERE id = ${todoId};
            `;
        resultQuery = await db.run(updateQuery);
        response.send(`${result} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case requestQuery.todo !== undefined:
      result = "Todo";

      updateQuery = `
                UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};
            `;
      resultQuery = await db.run(updateQuery);
      response.send(`${result} Updated`);
      break;
    case requestQuery.priority !== undefined:
      result = "Priority";
      const priorityText =
        priority === "HIGH" || priority === "MEDIUM" || priority === "LOW";
      if (priorityText) {
        updateQuery = `
                UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};
            `;
        resultQuery = await db.run(updateQuery);
        response.send(`${result} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;
    case requestQuery.category !== undefined:
      result = "Category";
      const categoryText =
        category === "WORK" || category === "HOME" || category === "LEARNING";
      if (categoryText) {
        updateQuery = `
                UPDATE todo SET category = '${category}' WHERE id = ${todoId};
            `;
        resultQuery = await db.run(updateQuery);
        response.send(`${result} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case requestQuery.dueDate !== undefined:
      const newDate = new Date(dueDate);
      const isValidDate = isValid(newDate);
      if (isValidDate) {
        const formatDate = format(new Date(dueDate), "yyyy-MM-dd");
        result = "Due Date";
        updateQuery = `
                UPDATE todo SET due_date = '${formatDate}' WHERE id = ${todoId};
            `;
        resultQuery = await db.run(updateQuery);
        response.send(`${result} Updated`);
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
  }
});

//Delete a todo API
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
        DELETE FROM todo WHERE id = ${todoId};
    `;
  const resultQuery = await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
