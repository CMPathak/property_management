from app.repositories.base import BaseRepository
from app.modules.expense.model import Expense
from app.modules.expense.schema import ExpenseCreate, ExpenseUpdate

class CRUDExpense(BaseRepository[Expense, ExpenseCreate, ExpenseUpdate]):
    pass

expense_crud = CRUDExpense(Expense)
