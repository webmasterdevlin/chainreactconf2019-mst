import { types, flow, destroy, getSnapshot, applySnapshot } from 'mobx-state-tree'
import { TodoType, TodoInitialState } from "../models/TodoType";
import {
  getTodos,
  postTodo,
  putTodo,
  deleteTodo
} from "../services/TodoService";

const TodoModel = types.model("TodoModel", TodoType);
const TodoStore = types
  .model("TodoStore", {
    todos: types.array(TodoModel),
    todo: types.maybeNull(TodoModel),
    isLoading: types.boolean
  })
  .actions(self => ({
    loadTodos: flow(function*() {
      self.isLoading = true;
      try {
        self.todos = (yield getTodos()).data;
      } catch (error) {
        alert(`${error.message}. Please try again.`);
      }
      self.isLoading = false;
    }),
    createTodo: flow(function*(newTodo) {
      // Don't optimistic update here if the ID is generated from the server
      self.isLoading = true;
      try {
        const { data } = yield postTodo(newTodo); // assuming IDs are generated by the server
        self.todos.unshift(data);
      } catch (error) {
        alert(`${error.message}. Please try again.`);
      }
      self.isLoading = false;
    }),
    strikethroughTodo: flow(function*(todo) {
      const index = self.todos.findIndex(t => t.id === todo.id);
      todo.isDone = !todo.isDone; // optimistic update
      self.todos[index] = todo;
      try {
        yield putTodo(todo);
      } catch (error) {
        // Rollback if PUT request fails
        todo.isDone = !todo.isDone;
        self.todos[index] = todo;
        alert(`${error.message}. Please try again.`);
      }
    }),
    removeTodo: flow(function*(todo) {
      const oldTodos = getSnapshot(self.todos);
      destroy(todo);  // optimistic update
      try {
        yield deleteTodo(todo);
      } catch (error) {
        // Rollback if DELETE request fails
        applySnapshot(self.todos, oldTodos)
        alert(`${error.message}. Please try again.`);
      }
    })
  }))
  .views(self => ({
    get remainingTodos() {
      return (
        self.todos.length - self.todos.filter(t => t.isDone === true).length
      );
    }
  }))
  .create({
    todos: [],
    todo: TodoInitialState,
    isLoading: false
  });

export default TodoStore;
